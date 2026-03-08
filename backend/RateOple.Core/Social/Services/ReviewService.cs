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

        var rating = await _context.Ratings
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == dto.RatingId)
            ?? throw new KeyNotFoundException("Rating not found.");

        if (rating.UserId != userId)
            throw new UnauthorizedAccessException("You can review only your own ratings.");

        if (dto.UpdatedRatingValue.HasValue)
            await UpdateRatingValueAsync(userId, rating, dto.UpdatedRatingValue.Value);

        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.RatingId == dto.RatingId);

        if (existingReview != null)
        {
            existingReview.Content = dto.Content.Trim();
            existingReview.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Map(existingReview);
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
        await _userTasteService.RecalculateForMediaContextAsync(userId, review.MediaId);
        await _interactionService.TrackReviewCreatedAsync(userId, rating.MediaId, rating.SeasonId, rating.EpisodeId);
        return Map(review);
    }

    public async Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid reviewId, UpdateReviewDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Review content is required.");

        var review = await _context.Reviews
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new KeyNotFoundException("Review not found.");

        if (review.UserId != userId)
            throw new UnauthorizedAccessException("You can update only your own reviews.");

        if (dto.UpdatedRatingValue.HasValue)
            await UpdateRatingValueAsync(userId, review.Rating, dto.UpdatedRatingValue.Value);

        review.Content = dto.Content.Trim();
        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _userTasteService.RecalculateForMediaContextAsync(userId, review.MediaId);

        return Map(review);
    }

    public async Task DeleteReviewAsync(Guid userId, Guid reviewId, bool deleteRating)
    {
        var review = await _context.Reviews
            .Include(r => r.Rating)
            .FirstOrDefaultAsync(r => r.Id == reviewId)
            ?? throw new KeyNotFoundException("Review not found.");

        if (review.UserId != userId)
            throw new UnauthorizedAccessException("You can delete only your own reviews.");

        _context.Reviews.Remove(review);
        await _context.SaveChangesAsync();
        await _userTasteService.RecalculateForMediaContextAsync(userId, review.MediaId);

        if (!deleteRating)
            return;

        var rating = review.Rating;
        if (rating.MediaId.HasValue)
            await _ratingService.DeleteMediaRatingAsync(userId, rating.MediaId.Value);
        else if (rating.SeasonId.HasValue)
            await _ratingService.DeleteSeasonRatingAsync(userId, rating.SeasonId.Value);
        else if (rating.EpisodeId.HasValue)
            await _ratingService.DeleteEpisodeRatingAsync(userId, rating.EpisodeId.Value);
    }

    public async Task<IReadOnlyList<ReviewDto>> GetMediaReviewsAsync(Guid mediaId)
    {
        var reviews = await _context.Reviews
            .AsNoTracking()
            .Where(r => r.MediaId == mediaId)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();

        return reviews.Select(Map).ToList();
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
        MediaId = review.MediaId,
        RatingId = review.RatingId,
        Content = review.Content,
        CreatedAt = review.CreatedAt,
        UpdatedAt = review.UpdatedAt
    };
}
