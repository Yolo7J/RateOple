using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Social.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Social.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _context;
    private readonly IRatingService _ratingService;
    private readonly IInteractionService _interactionService;
    private readonly IUserTasteService _userTasteService;

    public ReviewService(
        ApplicationDbContext context,
        IRatingService ratingService,
        IInteractionService interactionService,
        IUserTasteService userTasteService)
    {
        _context = context;
        _ratingService = ratingService;
        _interactionService = interactionService;
        _userTasteService = userTasteService;
    }

    public async Task<ReviewDto> CreateReviewAsync(Guid userId, CreateReviewDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Review content is required.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var rating = await _context.Ratings
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dto.RatingId)
            ?? throw new KeyNotFoundException("Rating not found.");

        if (rating.UserId != userId)
            throw new UnauthorizedAccessException("You can review only your own ratings.");

        await EnsureRatingTargetIsActiveAsync(rating);

        var ratingValueUpdated = dto.UpdatedRatingValue.HasValue;
        if (ratingValueUpdated)
            await UpdateRatingValueAsync(userId, rating, dto.UpdatedRatingValue.GetValueOrDefault());

        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.RatingId == dto.RatingId);

        if (existingReview != null)
        {
            existingReview.Content = dto.Content.Trim();
            existingReview.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            if (!ratingValueUpdated)
                await _userTasteService.RecalculateForMediaContextAsync(userId, existingReview.MediaId);
            await transaction.CommitAsync();
            return await MapWithDisplayNameAsync(existingReview);
        }

        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MediaId = await ResolveMediaIdFromRatingAsync(rating),
            RatingId = dto.RatingId,
            Content = dto.Content.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        await _interactionService.TrackReviewCreatedAsync(userId, rating.MediaId, rating.SeasonId, rating.EpisodeId);
        await transaction.CommitAsync();
        return await MapWithDisplayNameAsync(review);
    }

    public async Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid reviewId, UpdateReviewDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Review content is required.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var review = await _context.Reviews
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new KeyNotFoundException("Review not found.");

        if (review.UserId != userId)
            throw new UnauthorizedAccessException("You can update only your own reviews.");

        await EnsureRatingTargetIsActiveAsync(review.Rating);

        var ratingValueUpdated = dto.UpdatedRatingValue.HasValue;
        if (ratingValueUpdated)
            await UpdateRatingValueAsync(userId, review.Rating, dto.UpdatedRatingValue.GetValueOrDefault());

        review.Content = dto.Content.Trim();
        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        if (!ratingValueUpdated)
            await _userTasteService.RecalculateForMediaContextAsync(userId, review.MediaId);

        await transaction.CommitAsync();
        return await MapWithDisplayNameAsync(review);
    }

    public async Task DeleteReviewAsync(Guid userId, Guid reviewId, bool deleteRating)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var review = await _context.Reviews
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new KeyNotFoundException("Review not found.");

        if (review.UserId != userId)
            throw new UnauthorizedAccessException("You can delete only your own reviews.");

        var activeMediaId = await ResolveActiveMediaIdFromRatingAsync(review.Rating);

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();

        if (!deleteRating)
        {
            if (activeMediaId.HasValue)
                await _userTasteService.RecalculateForMediaContextAsync(userId, activeMediaId.Value);
            else
                await _userTasteService.RecalculateForUserAsync(userId);

            await transaction.CommitAsync();
            return;
        }

        var rating = review.Rating;
        if (rating.MediaId.HasValue)
            await _ratingService.DeleteMediaRatingAsync(userId, rating.MediaId.Value);
        else if (rating.SeasonId.HasValue)
            await _ratingService.DeleteSeasonRatingAsync(userId, rating.SeasonId.Value);
        else if (rating.EpisodeId.HasValue)
            await _ratingService.DeleteEpisodeRatingAsync(userId, rating.EpisodeId.Value);

        await transaction.CommitAsync();
    }

    public async Task<IReadOnlyList<ReviewDto>> GetMediaReviewsAsync(Guid mediaId)
    {
        return await _context.Reviews
            .AsNoTracking()
            .Where(r => r.MediaId == mediaId && !r.Media.IsDeleted)
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserDisplayName = r.User.Profile != null
                    ? r.User.Profile.DisplayName
                    : r.User.UserName,
                MediaId = r.MediaId,
                RatingId = r.RatingId,
                Content = r.Content,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<IReadOnlyList<ReviewDto>> GetUserReviewsAsync(Guid userId)
    {
        return await _context.Reviews
            .AsNoTracking()
            .Where(r => r.UserId == userId && !r.Media.IsDeleted)
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserDisplayName = r.User.Profile != null
                    ? r.User.Profile.DisplayName
                    : r.User.UserName,
                MediaId = r.MediaId,
                RatingId = r.RatingId,
                Content = r.Content,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync();
    }

    private async Task<Guid> ResolveMediaIdFromRatingAsync(Rating rating)
    {
        if (rating.MediaId.HasValue)
            return rating.MediaId.Value;

        if (rating.SeasonId.HasValue)
        {
            return await _context.Seasons
                .Where(s => s.Id == rating.SeasonId.Value)
                .Select(s => s.TvSeriesId)
                .FirstAsync();
        }

        if (rating.EpisodeId.HasValue)
        {
            return await _context.Episodes
                .Where(e => e.Id == rating.EpisodeId.Value)
                .Select(e => e.Season.TvSeriesId)
                .FirstAsync();
        }

        throw new InvalidOperationException("Rating target is invalid.");
    }

    private async Task<Guid?> ResolveActiveMediaIdFromRatingAsync(Rating rating)
    {
        if (rating.MediaId.HasValue)
        {
            return await _context.Media
                .Where(m => m.Id == rating.MediaId.Value && !m.IsDeleted)
                .Select(m => (Guid?)m.Id)
                .FirstOrDefaultAsync();
        }

        if (rating.SeasonId.HasValue)
        {
            return await _context.Seasons
                .Where(s => s.Id == rating.SeasonId.Value && !s.IsDeleted && !s.TvSeries.Media.IsDeleted)
                .Select(s => (Guid?)s.TvSeriesId)
                .FirstOrDefaultAsync();
        }

        if (rating.EpisodeId.HasValue)
        {
            return await _context.Episodes
                .Where(e =>
                    e.Id == rating.EpisodeId.Value &&
                    !e.IsDeleted &&
                    !e.Season.IsDeleted &&
                    !e.Season.TvSeries.Media.IsDeleted)
                .Select(e => (Guid?)e.Season.TvSeriesId)
                .FirstOrDefaultAsync();
        }

        throw new InvalidOperationException("Rating target is invalid.");
    }

    private async Task EnsureRatingTargetIsActiveAsync(Rating rating)
    {
        if (rating.MediaId.HasValue)
        {
            var exists = await _context.Media.AnyAsync(m => m.Id == rating.MediaId.Value && !m.IsDeleted);
            if (!exists)
                throw new KeyNotFoundException("Media not found.");
            return;
        }

        if (rating.SeasonId.HasValue)
        {
            var exists = await _context.Seasons.AnyAsync(s => s.Id == rating.SeasonId.Value && !s.IsDeleted && !s.TvSeries.Media.IsDeleted);
            if (!exists)
                throw new KeyNotFoundException("Season not found.");
            return;
        }

        if (rating.EpisodeId.HasValue)
        {
            var exists = await _context.Episodes.AnyAsync(e =>
                e.Id == rating.EpisodeId.Value &&
                !e.IsDeleted &&
                !e.Season.IsDeleted &&
                !e.Season.TvSeries.Media.IsDeleted);
            if (!exists)
                throw new KeyNotFoundException("Episode not found.");
            return;
        }

        throw new InvalidOperationException("Rating target is invalid.");
    }

    private async Task UpdateRatingValueAsync(Guid userId, Rating rating, int updatedRatingValue)
    {
        if (rating.MediaId.HasValue)
            await _ratingService.RateMediaAsync(userId, rating.MediaId.Value, updatedRatingValue);
        else if (rating.SeasonId.HasValue)
            await _ratingService.RateSeasonAsync(userId, rating.SeasonId.Value, updatedRatingValue);
        else if (rating.EpisodeId.HasValue)
            await _ratingService.RateEpisodeAsync(userId, rating.EpisodeId.Value, updatedRatingValue);
        else
            throw new InvalidOperationException("Rating target is invalid.");
    }

    private static ReviewDto Map(Review review) => new()
    {
        Id = review.Id,
        UserId = review.UserId,
        UserDisplayName = null,
        MediaId = review.MediaId,
        RatingId = review.RatingId,
        Content = review.Content,
        CreatedAt = review.CreatedAt,
        UpdatedAt = review.UpdatedAt
    };

    private async Task<ReviewDto> MapWithDisplayNameAsync(Review review)
    {
        var dto = Map(review);
        dto.UserDisplayName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == review.UserId)
            .Select(u => u.Profile != null ? u.Profile.DisplayName : u.UserName)
            .FirstOrDefaultAsync();

        return dto;
    }
}
