using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RateOple.Core.Contracts;
using RateOple.Core.Quotas;
using RateOple.Core.Social.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Social.Services;

public class RatingService : IRatingService
{
    private readonly ApplicationDbContext _context;
    private readonly IInteractionService _interactionService;
    private readonly IUserTasteService _userTasteService;
    private readonly IUserQuotaService? _quotaService;

    public RatingService(
        ApplicationDbContext context,
        IInteractionService interactionService,
        IUserTasteService userTasteService,
        IUserQuotaService? quotaService = null)
    {
        _context = context;
        _interactionService = interactionService;
        _userTasteService = userTasteService;
        _quotaService = quotaService;
    }

    public Task<RatingDto> RateMediaAsync(Guid userId, Guid mediaId, int value) =>
        UpsertRatingAsync(userId, mediaId: mediaId, seasonId: null, episodeId: null, value: value);

    public Task<RatingDto> RateSeasonAsync(Guid userId, Guid seasonId, int value) =>
        UpsertRatingAsync(userId, mediaId: null, seasonId: seasonId, episodeId: null, value: value);

    public Task<RatingDto> RateEpisodeAsync(Guid userId, Guid episodeId, int value) =>
        UpsertRatingAsync(userId, mediaId: null, seasonId: null, episodeId: episodeId, value: value);

    public Task DeleteMediaRatingAsync(Guid userId, Guid mediaId) =>
        DeleteRatingAsync(userId, mediaId: mediaId, seasonId: null, episodeId: null);

    public Task DeleteSeasonRatingAsync(Guid userId, Guid seasonId) =>
        DeleteRatingAsync(userId, mediaId: null, seasonId: seasonId, episodeId: null);

    public Task DeleteEpisodeRatingAsync(Guid userId, Guid episodeId) =>
        DeleteRatingAsync(userId, mediaId: null, seasonId: null, episodeId: episodeId);

    public async Task<MediaRatingSummaryDto> GetMediaRatingSummaryAsync(Guid mediaId, Guid? userId = null)
    {
        await EnsureMediaExistsAsync(mediaId);

        var query = _context.Ratings
            .AsNoTracking()
            .Where(r => r.MediaId == mediaId);

        var ratingsCount = await query.CountAsync();
        var averageRating = ratingsCount > 0
            ? await query.AverageAsync(r => (double)r.Value)
            : 0;

        int? userRating = null;
        Guid? currentUserRatingId = null;
        if (userId.HasValue)
        {
            var currentUserRating = await query
                .Where(r => r.UserId == userId.Value)
                .Select(r => new { Id = (Guid?)r.Id, Value = (int?)r.Value })
                .FirstOrDefaultAsync();

            userRating = currentUserRating?.Value;
            currentUserRatingId = currentUserRating?.Id;
        }

        return new MediaRatingSummaryDto
        {
            MediaId = mediaId,
            AverageRating = averageRating,
            RatingsCount = ratingsCount,
            UserRating = userRating,
            CurrentUserRatingId = currentUserRatingId
        };
    }

    public async Task<TargetRatingSummaryDto> GetSeasonRatingSummaryAsync(Guid seasonId, Guid? userId = null)
    {
        await EnsureSeasonExistsAsync(seasonId);
        return await GetSummaryAsync(mediaId: null, seasonId: seasonId, episodeId: null, userId);
    }

    public async Task<TargetRatingSummaryDto> GetEpisodeRatingSummaryAsync(Guid episodeId, Guid? userId = null)
    {
        await EnsureEpisodeExistsAsync(episodeId);
        return await GetSummaryAsync(mediaId: null, seasonId: null, episodeId: episodeId, userId);
    }

    public async Task<IEnumerable<RatingDto>> GetUserRatingsAsync(Guid userId)
    {
        var ratings = await _context.Ratings
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.UpdatedAt)
            .ToListAsync();

        return ratings.Select(MapToDto);
    }

    private async Task<RatingDto> UpsertRatingAsync(
        Guid userId,
        Guid? mediaId,
        Guid? seasonId,
        Guid? episodeId,
        int value)
    {
        if (value < 1 || value > 10)
            throw new ArgumentOutOfRangeException(nameof(value), "Rating must be between 1 and 10.");

        var targetCount = (mediaId.HasValue ? 1 : 0) + (seasonId.HasValue ? 1 : 0) + (episodeId.HasValue ? 1 : 0);
        if (targetCount != 1)
            throw new ArgumentException("Exactly one target must be specified.");

        if (mediaId.HasValue)
            await EnsureMediaExistsAsync(mediaId.Value);
        if (seasonId.HasValue)
            await EnsureSeasonExistsAsync(seasonId.Value);
        if (episodeId.HasValue)
            await EnsureEpisodeExistsAsync(episodeId.Value);

        await using var transaction = await BeginTransactionIfNeededAsync();

        var existingRating = await _context.Ratings.FirstOrDefaultAsync(r =>
            r.UserId == userId &&
            r.MediaId == mediaId &&
            r.SeasonId == seasonId &&
            r.EpisodeId == episodeId);

        var isNewRating = existingRating == null;
        if (existingRating != null)
        {
            existingRating.Value = value;
            existingRating.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            if (_quotaService != null)
                await _quotaService.EnsureCanCreateRatingAsync(userId);

            existingRating = new Rating
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                MediaId = mediaId,
                SeasonId = seasonId,
                EpisodeId = episodeId,
                Value = value,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Ratings.Add(existingRating);
        }

        await _context.SaveChangesAsync();

        var ownerMediaId = await ResolveOwnerMediaIdAsync(mediaId, seasonId, episodeId);
        if (ownerMediaId.HasValue)
            await RefreshMediaAggregateAsync(ownerMediaId.Value);
        if (ownerMediaId.HasValue)
            await _userTasteService.RecalculateForMediaContextAsync(userId, ownerMediaId.Value);

        if (isNewRating)
            await _interactionService.TrackRatingCreatedAsync(userId, mediaId, seasonId, episodeId);

        if (transaction != null)
            await transaction.CommitAsync();

        return MapToDto(existingRating);
    }

    private async Task DeleteRatingAsync(
        Guid userId,
        Guid? mediaId,
        Guid? seasonId,
        Guid? episodeId)
    {
        var targetCount = (mediaId.HasValue ? 1 : 0) + (seasonId.HasValue ? 1 : 0) + (episodeId.HasValue ? 1 : 0);
        if (targetCount != 1)
            throw new ArgumentException("Exactly one target must be specified.");

        if (mediaId.HasValue)
            await EnsureMediaExistsAsync(mediaId.Value);
        if (seasonId.HasValue)
            await EnsureSeasonExistsAsync(seasonId.Value);
        if (episodeId.HasValue)
            await EnsureEpisodeExistsAsync(episodeId.Value);

        await using var transaction = await BeginTransactionIfNeededAsync();

        var rating = await _context.Ratings.FirstOrDefaultAsync(r =>
            r.UserId == userId &&
            r.MediaId == mediaId &&
            r.SeasonId == seasonId &&
            r.EpisodeId == episodeId);

        if (rating == null)
            return;

        _context.Ratings.Remove(rating);
        await _context.SaveChangesAsync();

        var ownerMediaId = await ResolveOwnerMediaIdAsync(mediaId, seasonId, episodeId);
        if (ownerMediaId.HasValue)
            await RefreshMediaAggregateAsync(ownerMediaId.Value);
        if (ownerMediaId.HasValue)
            await _userTasteService.RecalculateForMediaContextAsync(userId, ownerMediaId.Value);

        if (transaction != null)
            await transaction.CommitAsync();
    }

    private async Task<IDbContextTransaction?> BeginTransactionIfNeededAsync()
    {
        return _context.Database.CurrentTransaction == null
            ? await _context.Database.BeginTransactionAsync()
            : null;
    }

    private async Task<TargetRatingSummaryDto> GetSummaryAsync(
        Guid? mediaId,
        Guid? seasonId,
        Guid? episodeId,
        Guid? userId)
    {
        var query = _context.Ratings
            .AsNoTracking()
            .Where(r => r.MediaId == mediaId && r.SeasonId == seasonId && r.EpisodeId == episodeId);

        var ratingsCount = await query.CountAsync();
        var averageRating = ratingsCount > 0
            ? await query.AverageAsync(r => (double)r.Value)
            : 0;

        int? userRating = null;
        Guid? currentUserRatingId = null;
        if (userId.HasValue)
        {
            var currentUserRating = await query
                .Where(r => r.UserId == userId.Value)
                .Select(r => new { Id = (Guid?)r.Id, Value = (int?)r.Value })
                .FirstOrDefaultAsync();

            userRating = currentUserRating?.Value;
            currentUserRatingId = currentUserRating?.Id;
        }

        return new TargetRatingSummaryDto
        {
            MediaId = mediaId,
            SeasonId = seasonId,
            EpisodeId = episodeId,
            AverageRating = averageRating,
            RatingsCount = ratingsCount,
            UserRating = userRating,
            CurrentUserRatingId = currentUserRatingId
        };
    }

    private async Task RefreshMediaAggregateAsync(Guid mediaId)
    {
        var media = await _context.Media.FirstOrDefaultAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (media == null)
            return;

        var seasonIds = await _context.Seasons
            .Where(s => s.TvSeriesId == mediaId && !s.IsDeleted)
            .Select(s => s.Id)
            .ToListAsync();

        var episodeIds = await _context.Episodes
            .Where(e => seasonIds.Contains(e.SeasonId) && !e.IsDeleted)
            .Select(e => e.Id)
            .ToListAsync();

        var relevantRatings = await _context.Ratings
            .AsNoTracking()
            .Where(r =>
                r.MediaId == mediaId ||
                (r.SeasonId.HasValue && seasonIds.Contains(r.SeasonId.Value)) ||
                (r.EpisodeId.HasValue && episodeIds.Contains(r.EpisodeId.Value)))
            .Select(r => r.Value)
            .ToListAsync();

        media.RatingsCount = relevantRatings.Count;
        media.AverageRating = relevantRatings.Count > 0 ? relevantRatings.Average() : 0;

        await _context.SaveChangesAsync();
    }

    private async Task<Guid?> ResolveOwnerMediaIdAsync(Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        if (mediaId.HasValue)
            return mediaId.Value;

        if (seasonId.HasValue)
            return await _context.Seasons
                .Where(s => s.Id == seasonId.Value && !s.IsDeleted && !s.TvSeries.Media.IsDeleted)
                .Select(s => (Guid?)s.TvSeriesId)
                .FirstOrDefaultAsync();

        if (episodeId.HasValue)
        {
            return await _context.Episodes
                .Where(e =>
                    e.Id == episodeId.Value &&
                    !e.IsDeleted &&
                    !e.Season.IsDeleted &&
                    !e.Season.TvSeries.Media.IsDeleted)
                .Select(e => (Guid?)e.Season.TvSeriesId)
                .FirstOrDefaultAsync();
        }

        return null;
    }

    private async Task EnsureMediaExistsAsync(Guid mediaId)
    {
        var exists = await _context.Media.AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!exists)
            throw new KeyNotFoundException($"Media {mediaId} not found.");
    }

    private async Task EnsureSeasonExistsAsync(Guid seasonId)
    {
        var exists = await _context.Seasons.AnyAsync(s =>
            s.Id == seasonId &&
            !s.IsDeleted &&
            !s.TvSeries.Media.IsDeleted);
        if (!exists)
            throw new KeyNotFoundException($"Season {seasonId} not found.");
    }

    private async Task EnsureEpisodeExistsAsync(Guid episodeId)
    {
        var exists = await _context.Episodes.AnyAsync(e =>
            e.Id == episodeId &&
            !e.IsDeleted &&
            !e.Season.IsDeleted &&
            !e.Season.TvSeries.Media.IsDeleted);
        if (!exists)
            throw new KeyNotFoundException($"Episode {episodeId} not found.");
    }

    private static RatingDto MapToDto(Rating rating) => new()
    {
        Id = rating.Id,
        Value = rating.Value,
        UserId = rating.UserId,
        MediaId = rating.MediaId,
        SeasonId = rating.SeasonId,
        EpisodeId = rating.EpisodeId,
        CreatedAt = rating.CreatedAt,
        UpdatedAt = rating.UpdatedAt
    };
}
