using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Social.Services;

public class UserTasteService : IUserTasteService
{
    private readonly ApplicationDbContext _context;

    public UserTasteService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task RecalculateForMediaContextAsync(Guid userId, Guid mediaId)
    {
        var mediaExists = await _context.Media.AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!mediaExists)
            throw new KeyNotFoundException($"Media {mediaId} not found.");

        await RecalculateForUserAsync(userId);
    }

    public async Task RecalculateForUserAsync(Guid userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
            throw new KeyNotFoundException($"User {userId} not found.");

        var scores = new Dictionary<int, double>();

        await AggregateRatingsAsync(userId, scores);
        await AggregateReviewsAsync(userId, scores);
        await AggregateInteractionsAsync(userId, scores);

        var existingScores = await _context.UserGenreScores
            .Where(x => x.UserId == userId)
            .ToListAsync();
        var existingByGenreId = existingScores.ToDictionary(x => x.GenreId);
        var nextScores = scores
            .Where(x => x.Value > 0)
            .ToDictionary(x => x.Key, x => x.Value);
        var now = DateTime.UtcNow;

        foreach (var (genreId, score) in nextScores)
        {
            if (existingByGenreId.TryGetValue(genreId, out var existing))
            {
                existing.Score = score;
                existing.UpdatedAt = now;
                existingByGenreId.Remove(genreId);
                continue;
            }

            _context.UserGenreScores.Add(new UserGenreScore
            {
                UserId = userId,
                GenreId = genreId,
                Score = score,
                UpdatedAt = now
            });
        }

        if (existingByGenreId.Count > 0)
            _context.UserGenreScores.RemoveRange(existingByGenreId.Values);

        await _context.SaveChangesAsync();
    }

    private async Task AggregateRatingsAsync(Guid userId, Dictionary<int, double> scores)
    {
        var ratings = await _context.Ratings
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .ToListAsync();

        foreach (var rating in ratings)
        {
            var mediaId = await ResolveMediaIdAsync(rating.MediaId, rating.SeasonId, rating.EpisodeId);
            if (!mediaId.HasValue)
                continue;

            await DistributePointsAcrossGenresAsync(mediaId.Value, rating.Value, scores);
        }
    }

    private async Task AggregateReviewsAsync(Guid userId, Dictionary<int, double> scores)
    {
        var reviews = await _context.Reviews
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .Select(r => r.MediaId)
            .ToListAsync();

        foreach (var mediaId in reviews)
            await DistributePointsAcrossGenresAsync(mediaId, 6, scores);
    }

    private async Task AggregateInteractionsAsync(Guid userId, Dictionary<int, double> scores)
    {
        var interactions = await _context.MediaInteractions
            .AsNoTracking()
            .Where(i => i.UserId == userId)
            .ToListAsync();

        foreach (var interaction in interactions)
        {
            var mediaId = await ResolveMediaIdAsync(interaction.MediaId, interaction.SeasonId, interaction.EpisodeId);
            if (!mediaId.HasValue)
                continue;

            await DistributePointsAcrossGenresAsync(mediaId.Value, interaction.Points, scores);
        }
    }

    private async Task<Guid?> ResolveMediaIdAsync(Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        if (mediaId.HasValue)
            return mediaId.Value;

        if (seasonId.HasValue)
        {
            return await _context.Seasons
                .Where(s => s.Id == seasonId.Value && !s.IsDeleted)
                .Select(s => (Guid?)s.TvSeriesId)
                .FirstOrDefaultAsync();
        }

        if (episodeId.HasValue)
        {
            return await _context.Episodes
                .Where(e => e.Id == episodeId.Value && !e.IsDeleted)
                .Select(e => (Guid?)e.Season.TvSeriesId)
                .FirstOrDefaultAsync();
        }

        return null;
    }

    private async Task DistributePointsAcrossGenresAsync(Guid mediaId, double points, Dictionary<int, double> scores)
    {
        var genreIds = await _context.MediaGenres
            .AsNoTracking()
            .Where(mg => mg.MediaId == mediaId)
            .Select(mg => mg.GenreId)
            .ToListAsync();

        if (genreIds.Count == 0 || points <= 0)
            return;

        var distributedPoints = points / genreIds.Count;
        foreach (var genreId in genreIds)
        {
            scores.TryGetValue(genreId, out var current);
            scores[genreId] = current + distributedPoints;
        }
    }
}
