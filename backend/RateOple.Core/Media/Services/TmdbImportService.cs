using System.Linq;
using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;

namespace RateOple.Core.Media.Services;

public class TmdbImportService : ITmdbImportService
{
    private readonly ITmdbService _tmdb;
    private readonly IMediaService _media;

    public TmdbImportService(ITmdbService tmdb, IMediaService media)
    {
        _tmdb = tmdb;
        _media = media;
    }

    public async Task<Guid> ImportSeriesAsync(int tmdbId)
    {
        var series = await _tmdb.GetSeriesDetailsAsync(tmdbId);
        if (series == null) throw new KeyNotFoundException("TMDB series not found.");

        var created = await _media.CreateTvSeriesAsync(new CreateTvSeriesDto
        {
            Title = series.Title,
            Description = series.Description,
            CoverUrl = series.CoverUrl,
            ReleaseYear = series.ReleaseYear,
            TmdbId = tmdbId,
            Seasons = series.Seasons.Select(s => new CreateSeasonDto
            {
                SeasonNumber = s.SeasonNumber,
                Episodes = s.Episodes.Select(e => new CreateEpisodeDto
                {
                    EpisodeNumber = e.EpisodeNumber,
                    Title = e.Title,
                    Duration = e.Duration
                }).ToList()
            }).ToList()
        });

        return created.Id;
    }
}
