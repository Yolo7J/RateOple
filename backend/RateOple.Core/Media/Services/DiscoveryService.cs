using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;
using RateOple.Infrastructure.Data;

namespace RateOple.Core.Media.Services;

public class DiscoveryService : IDiscoveryService
{
    private const int MaxLimit = 100;
    private readonly ApplicationDbContext _context;

    public DiscoveryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<MediaListItemDto>> GetTrendingAsync(int limit = 20)
    {
        limit = NormalizeLimit(limit);
        if (limit == 0)
            return [];

        var since = DateTime.UtcNow.AddDays(-14);

        var media = await _context.Media
            .Where(m => !m.IsDeleted)
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
            .Select(m => new
            {
                Media = m,
                InteractionScore = _context.MediaInteractions
                    .Where(i => i.MediaId == m.Id && i.CreatedAt >= since)
                    .Sum(i => (int?)i.Points) ?? 0,
                RecentRatingCount = _context.Ratings
                    .Count(r => r.MediaId == m.Id && r.UpdatedAt >= since)
            })
            .OrderByDescending(x => (x.InteractionScore * 1.0) + (x.RecentRatingCount * 5.0) + (x.Media.AverageRating * 2.0))
            .ThenBy(x => x.Media.Title)
            .ThenBy(x => x.Media.Id)
            .Take(limit)
            .ToListAsync();

        return media.Select(x => Map(x.Media)).ToList();
    }

    public async Task<IReadOnlyList<MediaListItemDto>> GetPopularAsync(int limit = 20)
    {
        limit = NormalizeLimit(limit);
        if (limit == 0)
            return [];

        var media = await _context.Media
            .Where(m => !m.IsDeleted)
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
            .OrderByDescending(m => m.RatingsCount)
            .ThenByDescending(m => m.AverageRating)
            .ThenBy(m => m.Title)
            .ThenBy(m => m.Id)
            .Take(limit)
            .ToListAsync();

        return media.Select(Map).ToList();
    }

    public async Task<IReadOnlyList<MediaListItemDto>> GetRecommendedAsync(Guid userId, int limit = 20)
    {
        limit = NormalizeLimit(limit);
        if (limit == 0)
            return [];

        var ratedMediaIds = await _context.Ratings
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.MediaId.HasValue)
            .Select(r => r.MediaId!.Value)
            .Distinct()
            .ToListAsync();
        var completedMediaIds = await _context.UserMediaStatuses
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == MediaProgressStatus.Done)
            .Select(s => s.MediaId)
            .Distinct()
            .ToListAsync();
        var excludedMediaIds = ratedMediaIds.Concat(completedMediaIds).ToHashSet();

        var userTaste = await _context.UserGenreScores
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .ToListAsync();
        var scoreByGenre = userTaste.ToDictionary(x => x.GenreId, x => x.Score);

        var candidates = await _context.Media
            .Where(m => !m.IsDeleted && !excludedMediaIds.Contains(m.Id))
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
            .ToListAsync();

        if (userTaste.Count == 0)
        {
            return candidates
                .OrderByDescending(m => m.RatingsCount)
                .ThenByDescending(m => m.AverageRating)
                .ThenBy(m => m.Title)
                .ThenBy(m => m.Id)
                .Take(limit)
                .Select(Map)
                .ToList();
        }

        var ranked = candidates
            .Select(m =>
            {
                var tasteScore = m.MediaGenres
                    .Select(mg => scoreByGenre.TryGetValue(mg.GenreId, out var score) ? score : 0)
                    .Sum();
                var finalScore = tasteScore + (m.AverageRating * 5) + (m.RatingsCount * 0.25);
                return new { Media = m, Score = finalScore };
            })
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Media.Title)
            .ThenBy(x => x.Media.Id)
            .Take(limit)
            .Select(x => Map(x.Media))
            .ToList();

        return ranked;
    }

    public async Task<IReadOnlyList<MediaListItemDto>> GetSimilarAsync(Guid mediaId, int limit = 20)
    {
        limit = NormalizeLimit(limit);
        if (limit == 0)
            return [];

        var sourceExists = await _context.Media
            .AsNoTracking()
            .AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!sourceExists)
            throw new KeyNotFoundException($"Media {mediaId} not found.");

        var sourceGenreIds = await _context.MediaGenres
            .AsNoTracking()
            .Where(mg => mg.MediaId == mediaId)
            .Select(mg => mg.GenreId)
            .ToListAsync();

        if (sourceGenreIds.Count == 0)
            return [];

        var candidates = await _context.Media
            .Where(m => !m.IsDeleted && m.Id != mediaId)
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
            .ToListAsync();

        var ranked = candidates
            .Select(m =>
            {
                var overlap = m.MediaGenres.Count(mg => sourceGenreIds.Contains(mg.GenreId));
                var similarityScore = (overlap * 10.0) + (m.AverageRating * 1.5);
                return new { Media = m, Overlap = overlap, Score = similarityScore };
            })
            .Where(x => x.Overlap > 0)
            .OrderByDescending(x => x.Overlap)
            .ThenByDescending(x => x.Score)
            .ThenBy(x => x.Media.Title)
            .ThenBy(x => x.Media.Id)
            .Take(limit)
            .Select(x => Map(x.Media))
            .ToList();

        return ranked;
    }

    private static MediaListItemDto Map(Infrastructure.Data.Entities.Media media) => new()
    {
        Id = media.Id,
        Type = media.Type.ToString(),
        Title = media.Title,
        ReleaseYear = media.ReleaseDate?.Year,
        CoverUrl = media.CoverUrl,
        AverageRating = media.AverageRating,
        RatingsCount = media.RatingsCount,
        Genres = media.MediaGenres
            .Where(mg => mg.Genre != null)
            .Select(mg => mg.Genre.Name)
            .ToList(),
        Tags = media.MediaTags
            .Where(mt => mt.Tag != null)
            .Select(mt => mt.Tag.Name)
            .ToList()
    };

    private static int NormalizeLimit(int limit)
    {
        if (limit <= 0)
            return 0;

        return Math.Min(limit, MaxLimit);
    }
}
