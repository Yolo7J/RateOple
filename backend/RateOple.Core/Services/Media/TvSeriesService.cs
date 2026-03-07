using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Services;

public class TvSeriesService : ITvSeriesService
{
    private readonly ApplicationDbContext _db;

    public TvSeriesService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ── Seasons ───────────────────────────────────────────────────────────────

    public async Task<List<SeasonDetailDto>> GetSeasonsAsync(Guid mediaId)
    {
        var tvSeries = await GetTvSeriesAsync(mediaId);

        return await _db.Seasons
            .Where(s => s.TvSeriesId == mediaId && !s.IsDeleted)
            .OrderBy(s => s.SeasonNumber)
            .Select(s => new SeasonDetailDto
            {
                Id = s.Id,
                SeasonNumber = s.SeasonNumber,
                Episodes = s.Episodes
                    .Where(e => !e.IsDeleted)
                    .OrderBy(e => e.EpisodeNumber)
                    .Select(e => new EpisodeDetailDto
                    {
                        Id = e.Id,
                        EpisodeNumber = e.EpisodeNumber,
                        Title = e.Title,
                        Duration = e.Duration,
                    })
                    .ToList(),
            })
            .ToListAsync();
    }

    public async Task<SeasonDetailDto> AddSeasonAsync(Guid mediaId, UpsertSeasonDto dto)
    {
        var tvSeries = await GetTvSeriesAsync(mediaId);

        // Check for duplicate season number (including soft-deleted — reactivate instead)
        var existing = await _db.Seasons
            .FirstOrDefaultAsync(s => s.TvSeriesId == mediaId && s.SeasonNumber == dto.SeasonNumber);

        if (existing != null && !existing.IsDeleted)
            throw new InvalidOperationException($"Season {dto.SeasonNumber} already exists.");

        Season season;
        if (existing != null && existing.IsDeleted)
        {
            // Reactivate soft-deleted season
            existing.IsDeleted = false;
            season = existing;
        }
        else
        {
            season = new Season
            {
                Id = Guid.NewGuid(),
                TvSeriesId = mediaId,
                SeasonNumber = dto.SeasonNumber,
            };
            _db.Seasons.Add(season);
        }

        // Add episodes
        season.Episodes ??= new List<Episode>();
        foreach (var epDto in dto.Episodes.OrderBy(e => e.EpisodeNumber))
        {
            season.Episodes.Add(new Episode
            {
                Id = Guid.NewGuid(),
                SeasonId = season.Id,
                EpisodeNumber = epDto.EpisodeNumber,
                Title = epDto.Title ?? $"Episode {epDto.EpisodeNumber}",
                Duration = epDto.Duration,
            });
        }

        // Keep SeasonsCount in sync
        tvSeries.SeasonsCount = await _db.Seasons
            .CountAsync(s => s.TvSeriesId == mediaId && !s.IsDeleted) + 1;

        await _db.SaveChangesAsync();
        return await GetSeasonDtoAsync(mediaId, season.SeasonNumber);
    }

    public async Task<SeasonDetailDto> UpdateSeasonAsync(Guid mediaId, int seasonNumber, UpsertSeasonDto dto)
    {
        await GetTvSeriesAsync(mediaId); // validates series exists

        var season = await _db.Seasons
            .Include(s => s.Episodes)
            .FirstOrDefaultAsync(s => s.TvSeriesId == mediaId && s.SeasonNumber == seasonNumber && !s.IsDeleted)
            ?? throw new KeyNotFoundException($"Season {seasonNumber} not found.");

        var targetSeasonNumber = seasonNumber;
        if (dto.SeasonNumber > 0 && dto.SeasonNumber != seasonNumber)
        {
            var duplicateSeasonExists = await _db.Seasons
                .AnyAsync(s =>
                    s.TvSeriesId == mediaId &&
                    s.SeasonNumber == dto.SeasonNumber &&
                    !s.IsDeleted &&
                    s.Id != season.Id);

            if (duplicateSeasonExists)
                throw new InvalidOperationException($"Season {dto.SeasonNumber} already exists.");

            season.SeasonNumber = dto.SeasonNumber;
            targetSeasonNumber = dto.SeasonNumber;
        }

        // Patch episodes: match by EpisodeNumber, insert new ones
        foreach (var epDto in dto.Episodes)
        {
            var episode = season.Episodes
                .FirstOrDefault(e => e.EpisodeNumber == epDto.EpisodeNumber && !e.IsDeleted);

            if (episode != null)
            {
                // Patch only provided fields
                if (epDto.Title != null) episode.Title = epDto.Title;
                if (epDto.Duration.HasValue) episode.Duration = epDto.Duration;
            }
            else
            {
                // New episode
                season.Episodes.Add(new Episode
                {
                    Id = Guid.NewGuid(),
                    SeasonId = season.Id,
                    EpisodeNumber = epDto.EpisodeNumber,
                    Title = epDto.Title ?? $"Episode {epDto.EpisodeNumber}",
                    Duration = epDto.Duration,
                });
            }
        }

        await _db.SaveChangesAsync();
        return await GetSeasonDtoAsync(mediaId, targetSeasonNumber);
    }

    public async Task DeleteSeasonAsync(Guid mediaId, int seasonNumber)
    {
        await GetTvSeriesAsync(mediaId);

        var season = await _db.Seasons
            .Include(s => s.Episodes)
            .FirstOrDefaultAsync(s => s.TvSeriesId == mediaId && s.SeasonNumber == seasonNumber && !s.IsDeleted)
            ?? throw new KeyNotFoundException($"Season {seasonNumber} not found.");

        // Soft-delete season and all its episodes
        season.IsDeleted = true;
        foreach (var ep in season.Episodes.Where(e => !e.IsDeleted))
            ep.IsDeleted = true;

        // Keep SeasonsCount in sync
        var tvSeries = await _db.TvSeries.FindAsync(mediaId);
        if (tvSeries != null)
            tvSeries.SeasonsCount = await _db.Seasons
                .CountAsync(s => s.TvSeriesId == mediaId && !s.IsDeleted) - 1;

        await _db.SaveChangesAsync();
    }

    // ── Episodes ──────────────────────────────────────────────────────────────

    public async Task<EpisodeDetailDto> AddEpisodeAsync(Guid mediaId, int seasonNumber, UpsertEpisodeDto dto)
    {
        var season = await GetSeasonAsync(mediaId, seasonNumber);

        var exists = season.Episodes
            .Any(e => e.EpisodeNumber == dto.EpisodeNumber && !e.IsDeleted);
        if (exists)
            throw new InvalidOperationException($"Episode {dto.EpisodeNumber} already exists in season {seasonNumber}.");

        var episode = new Episode
        {
            Id = Guid.NewGuid(),
            SeasonId = season.Id,
            EpisodeNumber = dto.EpisodeNumber,
            Title = dto.Title ?? $"Episode {dto.EpisodeNumber}",
            Duration = dto.Duration,
        };

        season.Episodes.Add(episode);
        await _db.SaveChangesAsync();

        return MapEpisode(episode);
    }

    public async Task<EpisodeDetailDto> UpdateEpisodeAsync(
        Guid mediaId, int seasonNumber, int episodeNumber, UpsertEpisodeDto dto)
    {
        var season = await GetSeasonAsync(mediaId, seasonNumber);

        var episode = season.Episodes
            .FirstOrDefault(e => e.EpisodeNumber == episodeNumber && !e.IsDeleted)
            ?? throw new KeyNotFoundException($"Episode {episodeNumber} not found in season {seasonNumber}.");

        if (dto.Title != null) episode.Title = dto.Title;
        if (dto.Duration.HasValue) episode.Duration = dto.Duration;

        await _db.SaveChangesAsync();
        return MapEpisode(episode);
    }

    public async Task DeleteEpisodeAsync(Guid mediaId, int seasonNumber, int episodeNumber)
    {
        var season = await GetSeasonAsync(mediaId, seasonNumber);

        var episode = season.Episodes
            .FirstOrDefault(e => e.EpisodeNumber == episodeNumber && !e.IsDeleted)
            ?? throw new KeyNotFoundException($"Episode {episodeNumber} not found in season {seasonNumber}.");

        episode.IsDeleted = true;
        await _db.SaveChangesAsync();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<TvSeries> GetTvSeriesAsync(Guid mediaId)
    {
        var tvSeries = await _db.TvSeries
            .FirstOrDefaultAsync(tv => tv.MediaId == mediaId);

        if (tvSeries == null)
            throw new KeyNotFoundException($"TvSeries with MediaId {mediaId} not found.");

        // Also check the parent Media isn't soft-deleted
        var mediaExists = await _db.Media
            .AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!mediaExists)
            throw new KeyNotFoundException($"Media {mediaId} not found or has been deleted.");

        return tvSeries;
    }

    private async Task<Season> GetSeasonAsync(Guid mediaId, int seasonNumber)
    {
        await GetTvSeriesAsync(mediaId);

        return await _db.Seasons
            .Include(s => s.Episodes)
            .FirstOrDefaultAsync(s => s.TvSeriesId == mediaId && s.SeasonNumber == seasonNumber && !s.IsDeleted)
            ?? throw new KeyNotFoundException($"Season {seasonNumber} not found.");
    }

    private async Task<SeasonDetailDto> GetSeasonDtoAsync(Guid mediaId, int seasonNumber)
    {
        var season = await _db.Seasons
            .Include(s => s.Episodes)
            .FirstAsync(s => s.TvSeriesId == mediaId && s.SeasonNumber == seasonNumber && !s.IsDeleted);

        return new SeasonDetailDto
        {
            Id = season.Id,
            SeasonNumber = season.SeasonNumber,
            Episodes = season.Episodes
                .Where(e => !e.IsDeleted)
                .OrderBy(e => e.EpisodeNumber)
                .Select(MapEpisode)
                .ToList(),
        };
    }

    private static EpisodeDetailDto MapEpisode(Episode e) => new()
    {
        Id = e.Id,
        EpisodeNumber = e.EpisodeNumber,
        Title = e.Title,
        Duration = e.Duration,
    };
}
