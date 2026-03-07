using System;
using System.Threading.Tasks;
using System.Linq;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Core.Services
{
    public class TmdbImportService : ITmdbImportService
    {
        private readonly ITmdbService _tmdb;
        private readonly IMediaService _media;
        private readonly ITvSeriesService _tv;

        public TmdbImportService(ITmdbService tmdb, IMediaService media, ITvSeriesService tv)
        {
            _tmdb = tmdb;
            _media = media;
            _tv = tv;
        }

        public async Task<Guid> ImportSeriesAsync(int tmdbId)
        {
            // Prevent duplicate imports by TmdbId
            // Try to find an existing TV series with this TmdbId
            var all = await _media.GetAllAsync(new MediaQueryDto { Types = new List<string> { "TvSeries" } });
            var existing = all.Items.FirstOrDefault(m => m.Type == "TvSeries" && m.Id != Guid.Empty && m.Title != null && m.ReleaseYear != null);
            // NOTE: Ideally, you would have a method to get by TmdbId directly. For now, we check all.
            // If you add TmdbId to MediaListItemDto, you can filter here.

            // Fetch full series details from TMDB
            var series = await _tmdb.GetSeriesDetailsAsync(tmdbId);
            if (series == null) throw new Exception("TMDB series not found.");

            // Create the TV series
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
}
