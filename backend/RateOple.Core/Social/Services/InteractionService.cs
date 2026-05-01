using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Social.Services;

public class InteractionService : IInteractionService
{
    private readonly ApplicationDbContext _context;
    private readonly IUserTasteService _userTasteService;

    public InteractionService(ApplicationDbContext context, IUserTasteService userTasteService)
    {
        _context = context;
        _userTasteService = userTasteService;
    }

    public Task TrackMediaOpenedAsync(Guid userId, Guid mediaId) =>
        TrackAsync(userId, mediaId, null, null, InteractionType.MediaOpened, points: 1);

    public Task TrackRatingCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId) =>
        TrackAsync(userId, mediaId, seasonId, episodeId, InteractionType.RatingCreated, points: 5);

    public Task TrackReviewCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId) =>
        TrackAsync(userId, mediaId, seasonId, episodeId, InteractionType.ReviewCreated, points: 8);

    public Task TrackMediaStatusChangedAsync(Guid userId, Guid mediaId) =>
        TrackAsync(userId, mediaId, null, null, InteractionType.MediaStatusChanged, points: 4);

    private async Task TrackAsync(
        Guid userId,
        Guid? mediaId,
        Guid? seasonId,
        Guid? episodeId,
        InteractionType interactionType,
        int points)
    {
        var targetCount = (mediaId.HasValue ? 1 : 0) + (seasonId.HasValue ? 1 : 0) + (episodeId.HasValue ? 1 : 0);
        if (targetCount != 1)
            throw new ArgumentException("Exactly one target must be set for an interaction.");

        await EnsureUserExistsAsync(userId);
        await EnsureTargetExistsAsync(mediaId, seasonId, episodeId);

        await using var transaction = await BeginTransactionIfNeededAsync();

        var interaction = new MediaInteraction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MediaId = mediaId,
            SeasonId = seasonId,
            EpisodeId = episodeId,
            InteractionType = interactionType,
            Points = points,
            CreatedAt = DateTime.UtcNow
        };

        _context.MediaInteractions.Add(interaction);
        await _context.SaveChangesAsync();

        var ownerMediaId = await ResolveMediaIdAsync(mediaId, seasonId, episodeId);
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

    private async Task EnsureUserExistsAsync(Guid userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
            throw new KeyNotFoundException($"User {userId} not found.");
    }

    private async Task EnsureTargetExistsAsync(Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        if (mediaId.HasValue)
        {
            var mediaExists = await _context.Media.AnyAsync(m => m.Id == mediaId.Value && !m.IsDeleted);
            if (!mediaExists)
                throw new KeyNotFoundException($"Media {mediaId.Value} not found.");
            return;
        }

        if (seasonId.HasValue)
        {
            var seasonExists = await _context.Seasons.AnyAsync(s =>
                s.Id == seasonId.Value &&
                !s.IsDeleted &&
                !s.TvSeries.Media.IsDeleted);
            if (!seasonExists)
                throw new KeyNotFoundException($"Season {seasonId.Value} not found.");
            return;
        }

        if (episodeId.HasValue)
        {
            var episodeExists = await _context.Episodes.AnyAsync(e =>
                e.Id == episodeId.Value &&
                !e.IsDeleted &&
                !e.Season.IsDeleted &&
                !e.Season.TvSeries.Media.IsDeleted);
            if (!episodeExists)
                throw new KeyNotFoundException($"Episode {episodeId.Value} not found.");
        }
    }

    private async Task<Guid?> ResolveMediaIdAsync(Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        if (mediaId.HasValue)
            return mediaId.Value;

        if (seasonId.HasValue)
        {
            return await _context.Seasons
                .Where(s => s.Id == seasonId.Value && !s.IsDeleted && !s.TvSeries.Media.IsDeleted)
                .Select(s => (Guid?)s.TvSeriesId)
                .FirstOrDefaultAsync();
        }

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
}
