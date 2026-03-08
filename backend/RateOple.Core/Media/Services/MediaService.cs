using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Media.Services;

public class MediaService : IMediaService
{
    private readonly ApplicationDbContext _db;
    private readonly IOpenLibraryService _ol;

    public MediaService(ApplicationDbContext db, IOpenLibraryService ol)
    {
        _db = db;
        _ol = ol;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public async Task<PagedResultDto<MediaListItemDto>> GetAllAsync(MediaQueryDto query)
    {
        try
        {
            var q = _db.Media
                .Where(m => !m.IsDeleted)
                .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
                .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
                .AsQueryable();

            if (query.Types != null && query.Types.Count > 0)
            {
                var types = query.Types
                    .Select(t => Enum.TryParse<MediaType>(t, true, out var mt) ? mt : (MediaType?)null)
                    .Where(t => t != null)
                    .Select(t => t!.Value)
                    .ToList();

                if (types.Count > 0)
                    q = q.Where(m => types.Contains(m.Type));
            }

            if (query.GenreIds != null && query.GenreIds.Count > 0)
                q = q.Where(m => m.MediaGenres.Any(mg => query.GenreIds.Contains(mg.GenreId)));
            if (query.TagIds != null && query.TagIds.Count > 0)
                q = q.Where(m => m.MediaTags.Any(mt => query.TagIds.Contains(mt.TagId)));

            if (!string.IsNullOrWhiteSpace(query.Search))
                q = q.Where(m => m.Title.ToLower().Contains(query.Search.ToLower()));

            q = (query.SortBy, query.SortDir) switch
            {
                ("year",   "asc")  => q.OrderBy(m => m.ReleaseDate),
                ("year",   "desc") => q.OrderByDescending(m => m.ReleaseDate),
                ("title",  "asc")  => q.OrderBy(m => m.Title),
                ("title",  "desc") => q.OrderByDescending(m => m.Title),
                ("rating", "asc")  => q.OrderBy(m => m.AverageRating),
                _                  => q.OrderByDescending(m => m.AverageRating),
            };

            var totalCount = await q.CountAsync();

            var items = await q
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(m => new MediaListItemDto
                {
                    Id            = m.Id,
                    Type          = m.Type.ToString(),
                    Title         = m.Title,
                    ReleaseYear   = m.ReleaseDate != null ? m.ReleaseDate.Value.Year : null,
                    CoverUrl      = m.CoverUrl,
                    AverageRating = m.AverageRating,
                    RatingsCount  = m.RatingsCount,
                    Genres        = m.MediaGenres
                        .Where(mg => mg.Genre != null && mg.Genre.Name != null)
                        .Select(mg => mg.Genre.Name!)
                        .ToList(),
                    Tags          = m.MediaTags
                        .Where(mt => mt.Tag != null && mt.Tag.Name != null)
                        .Select(mt => mt.Tag.Name)
                        .ToList()
                })
                .ToListAsync();

            return new PagedResultDto<MediaListItemDto>
            {
                Items      = items,
                TotalCount = totalCount,
                Page       = query.Page,
                PageSize   = query.PageSize,
            };
        }
        catch (Exception ex)
        {
            // Log to console for now; in production use a logger
            Console.WriteLine($"[MediaService.GetAllAsync] ERROR: {ex.Message}\n{ex.StackTrace}");
            throw new Exception("A server error occurred while fetching media. Please check the server logs for details.");
        }
    }

    public async Task<MediaDetailDto?> GetByIdAsync(Guid id)
    {
        var m = await GetWithIncludes(id, throwIfMissing: false);
        return m == null ? null : MapToDetail(m);
    }

    public async Task<List<GenreDto>> GetGenresAsync()
    {
        return await _db.Genres
            .OrderBy(g => g.Name)
            .Select(g => new GenreDto { Id = g.Id, Name = g.Name })
            .ToListAsync();
    }

    public async Task<List<TagDto>> GetTagsAsync()
    {
        return await _db.Tags
            .OrderBy(t => t.Name)
            .Select(t => new TagDto { Id = t.Id, Name = t.Name })
            .ToListAsync();
    }

    // ── Single create ─────────────────────────────────────────────────────────

    public async Task<MediaDetailDto> CreateMovieAsync(CreateMovieDto dto)
    {
        var media = BuildBaseMedia(MediaType.Movie, dto.Title, dto.Description,
                                   dto.CoverUrl, dto.ReleaseYear);
        media.Movie = new Movie
        {
            MediaId   = media.Id,
            Director  = dto.Director,
            Duration  = dto.Duration,
            TmdbId    = dto.TmdbId,
        };

        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(media.Id));
    }

    public async Task<MediaDetailDto> CreateBookAsync(CreateBookDto dto)
    {
        var media = BuildBaseMedia(MediaType.Book, dto.Title, dto.Description,
                                   dto.CoverUrl, dto.ReleaseYear);
        media.Book = new Book
        {
            MediaId = media.Id,
            Author  = dto.Author,
            Pages   = dto.Pages,
            Isbn    = dto.Isbn,
            OlId    = dto.OlId,
        };

        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(media.Id));
    }

    public async Task<MediaDetailDto> CreateTvSeriesAsync(CreateTvSeriesDto dto)
    {
        var media = BuildBaseMedia(MediaType.TvSeries, dto.Title, dto.Description,
                                   dto.CoverUrl, dto.ReleaseYear);

        var tvSeries = new TvSeries
        {
            MediaId      = media.Id,
            TmdbId       = dto.TmdbId,
            SeasonsCount = dto.Seasons.Count > 0 ? dto.Seasons.Count : null,
        };

        var allSeasons = new List<Season>();
        var allEpisodes = new List<Episode>();

        foreach (var seasonDto in dto.Seasons.OrderBy(s => s.SeasonNumber))
        {
            var season = new Season
            {
                Id           = Guid.NewGuid(),
                TvSeriesId   = media.Id,
                SeasonNumber = seasonDto.SeasonNumber,
            };
            allSeasons.Add(season);

            foreach (var epDto in seasonDto.Episodes.OrderBy(e => e.EpisodeNumber))
            {
                var episode = new Episode
                {
                    Id            = Guid.NewGuid(),
                    SeasonId      = season.Id,
                    EpisodeNumber = epDto.EpisodeNumber,
                    Title         = epDto.Title,
                    Duration      = epDto.Duration,
                };
                allEpisodes.Add(episode);
                season.Episodes.Add(episode);
            }

            tvSeries.Seasons.Add(season);
        }

        media.TvSeries = tvSeries;
        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        if (allSeasons.Count > 0)
            _db.Seasons.AddRange(allSeasons);
        if (allEpisodes.Count > 0)
            _db.Episodes.AddRange(allEpisodes);
        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(media.Id));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public async Task<MediaDetailDto> UpdateMovieAsync(Guid id, UpdateMovieDto dto)
    {
        var media = await GetWithIncludes(id);

        if (media.Type != MediaType.Movie)
            throw new InvalidOperationException("Media is not a Movie.");

        PatchBaseMedia(media, dto.Title, dto.Description, dto.CoverUrl, dto.ReleaseYear);

        if (media.Movie != null)
        {
            if (dto.Director != null) media.Movie.Director = dto.Director;
            if (dto.Duration.HasValue) media.Movie.Duration = dto.Duration;
        }

        if (dto.GenreIds != null)
            await ReplaceGenres(media, dto.GenreIds);

        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(id));
    }

    public async Task<MediaDetailDto> UpdateBookAsync(Guid id, UpdateBookDto dto)
    {
        var media = await GetWithIncludes(id);

        if (media.Type != MediaType.Book)
            throw new InvalidOperationException("Media is not a Book.");

        PatchBaseMedia(media, dto.Title, dto.Description, dto.CoverUrl, dto.ReleaseYear);

        if (media.Book != null)
        {
            if (dto.Author != null) media.Book.Author = dto.Author;
            if (dto.Pages.HasValue) media.Book.Pages = dto.Pages;
            if (dto.Isbn != null) media.Book.Isbn = dto.Isbn;
        }

        if (dto.GenreIds != null)
            await ReplaceGenres(media, dto.GenreIds);

        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(id));
    }

    public async Task<MediaDetailDto> UpdateTvSeriesAsync(Guid id, UpdateTvSeriesDto dto)
    {
        var media = await GetWithIncludes(id);

        if (media.Type != MediaType.TvSeries)
            throw new InvalidOperationException("Media is not a TvSeries.");

        PatchBaseMedia(media, dto.Title, dto.Description, dto.CoverUrl, dto.ReleaseYear);

        if (dto.GenreIds != null)
            await ReplaceGenres(media, dto.GenreIds);

        // Patch seasons: match by SeasonNumber, add new ones, patch existing episodes
        if (dto.Seasons.Count > 0 && media.TvSeries != null)
        {
            var existingSeasons = await _db.Seasons
                .Include(s => s.Episodes)
                .Where(s => s.TvSeriesId == id && !s.IsDeleted)
                .ToListAsync();

            foreach (var seasonDto in dto.Seasons)
            {
                var season = existingSeasons
                    .FirstOrDefault(s => s.SeasonNumber == seasonDto.SeasonNumber);

                if (season == null)
                {
                    // New season
                    season = new Season
                    {
                        Id           = Guid.NewGuid(),
                        TvSeriesId   = id,
                        SeasonNumber = seasonDto.SeasonNumber,
                    };
                    _db.Seasons.Add(season);
                }

                // Patch episodes
                foreach (var epDto in seasonDto.Episodes)
                {
                    var episode = season.Episodes
                        .FirstOrDefault(e => e.EpisodeNumber == epDto.EpisodeNumber && !e.IsDeleted);

                    if (episode != null)
                    {
                        if (epDto.Title != null) episode.Title = epDto.Title;
                        if (epDto.Duration.HasValue) episode.Duration = epDto.Duration;
                    }
                    else
                    {
                        season.Episodes.Add(new Episode
                        {
                            Id            = Guid.NewGuid(),
                            SeasonId      = season.Id,
                            EpisodeNumber = epDto.EpisodeNumber,
                            Title         = epDto.Title ?? $"Episode {epDto.EpisodeNumber}",
                            Duration      = epDto.Duration,
                        });
                    }
                }
            }

            // Sync SeasonsCount
            media.TvSeries.SeasonsCount = await _db.Seasons
                .CountAsync(s => s.TvSeriesId == id && !s.IsDeleted);
        }

        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(id));
    }

    public async Task<MediaDetailDto> AddTagsAsync(Guid id, UpsertMediaTagsDto dto)
    {
        var media = await GetWithIncludes(id);

        var normalizedNames = dto.TagNames
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedNames.Count == 0)
            return MapToDetail(media);

        var existingTags = await _db.Tags
            .Where(t => normalizedNames.Contains(t.Name))
            .ToListAsync();

        var existingNames = existingTags
            .Select(t => t.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var newTags = normalizedNames
            .Where(x => !existingNames.Contains(x))
            .Select(x => new Tag { Name = x })
            .ToList();

        if (newTags.Count > 0)
        {
            _db.Tags.AddRange(newTags);
            await _db.SaveChangesAsync();
        }

        var allTags = existingTags.Concat(newTags).ToList();
        var alreadyLinked = media.MediaTags.Select(mt => mt.TagId).ToHashSet();
        var linksToAdd = allTags
            .Where(t => !alreadyLinked.Contains(t.Id))
            .Select(t => new MediaTag { MediaId = media.Id, TagId = t.Id })
            .ToList();

        if (linksToAdd.Count > 0)
            _db.MediaTags.AddRange(linksToAdd);

        await _db.SaveChangesAsync();
        return MapToDetail(await GetWithIncludes(id));
    }

    public async Task<MediaDetailDto> RemoveTagAsync(Guid id, int tagId)
    {
        var media = await GetWithIncludes(id);

        var link = await _db.MediaTags
            .FirstOrDefaultAsync(mt => mt.MediaId == media.Id && mt.TagId == tagId);

        if (link != null)
        {
            _db.MediaTags.Remove(link);
            await _db.SaveChangesAsync();
        }

        return MapToDetail(await GetWithIncludes(id));
    }

    // ── Soft delete ───────────────────────────────────────────────────────────

    public async Task SoftDeleteAsync(Guid id)
    {
        var media = await _db.Media
            .Include(m => m.TvSeries)
                .ThenInclude(tv => tv!.Seasons)
                .ThenInclude(s => s.Episodes)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted)
            ?? throw new KeyNotFoundException($"Media {id} not found.");

        media.IsDeleted = true;

        // Soft-delete seasons and episodes if TvSeries
        if (media.TvSeries != null)
        {
            foreach (var season in media.TvSeries.Seasons.Where(s => !s.IsDeleted))
            {
                season.IsDeleted = true;
                foreach (var episode in season.Episodes.Where(e => !e.IsDeleted))
                    episode.IsDeleted = true;
            }
        }

        await _db.SaveChangesAsync();
    }

    // ── Bulk create ───────────────────────────────────────────────────────────

    public async Task<BulkCreateResultDto> BulkCreateAsync(BulkCreateDto dto)
    {
        var result = new BulkCreateResultDto();

        foreach (var movie in dto.Movies)
        {
            try { result.Created.Add(await CreateMovieAsync(movie)); }
            catch (Exception ex)
            {
                result.Errors.Add(new BulkCreateErrorDto { Title = movie.Title, Type = "Movie", Reason = ex.Message });
            }
        }

        foreach (var book in dto.Books)
        {
            try { result.Created.Add(await CreateBookAsync(book)); }
            catch (Exception ex)
            {
                result.Errors.Add(new BulkCreateErrorDto { Title = book.Title, Type = "Book", Reason = ex.Message });
            }
        }

        foreach (var series in dto.TvSeries)
        {
            try { result.Created.Add(await CreateTvSeriesAsync(series)); }
            catch (Exception ex)
            {
                result.Errors.Add(new BulkCreateErrorDto { Title = series.Title, Type = "TvSeries", Reason = ex.Message });
            }
        }

        return result;
    }

    // ── Open Library proxy ────────────────────────────────────────────────────

    public Task<List<OlSearchResultDto>> SearchBooksAsync(string query) =>
        _ol.SearchAsync(query);

    public Task<OlDetailsDto?> GetBookDetailsAsync(string olId) =>
        _ol.GetDetailsAsync(olId);

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static MediaEntity BuildBaseMedia(
        MediaType type, string title, string? description,
        string? coverUrl, int? releaseYear) => new()
    {
        Id          = Guid.NewGuid(),
        Type        = type,
        Title       = title,
        Description = description,
        CoverUrl    = coverUrl,
        ReleaseDate = releaseYear.HasValue
            ? new DateTime(releaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            : null,
        CreatedAt   = DateTime.UtcNow,
    };

    private static void PatchBaseMedia(
        MediaEntity media, string? title, string? description,
        string? coverUrl, int? releaseYear)
    {
        if (title != null) media.Title = title;
        if (description != null) media.Description = description;
        if (coverUrl != null) media.CoverUrl = coverUrl;
        if (releaseYear.HasValue)
            media.ReleaseDate = new DateTime(releaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private async Task AttachGenres(MediaEntity media, List<int> genreIds)
    {
        if (genreIds.Count == 0) return;

        var validIds = await _db.Genres
            .Where(g => genreIds.Contains(g.Id))
            .Select(g => g.Id)
            .ToListAsync();

        media.MediaGenres = validIds
            .Select(gId => new MediaGenre { MediaId = media.Id, GenreId = gId })
            .ToList();
    }

    private async Task ReplaceGenres(MediaEntity media, List<int> genreIds)
    {
        // Remove existing genre links
        var existing = await _db.MediaGenres
            .Where(mg => mg.MediaId == media.Id)
            .ToListAsync();
        _db.MediaGenres.RemoveRange(existing);

        // Attach new ones
        var validIds = await _db.Genres
            .Where(g => genreIds.Contains(g.Id))
            .Select(g => g.Id)
            .ToListAsync();

        foreach (var gId in validIds)
            _db.MediaGenres.Add(new MediaGenre { MediaId = media.Id, GenreId = gId });
    }

    private async Task<MediaEntity> GetWithIncludes(Guid id, bool throwIfMissing = true)
    {
        var m = await _db.Media
            .Where(m => !m.IsDeleted)                           // soft-delete filter
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.MediaTags).ThenInclude(mt => mt.Tag)
            .Include(m => m.Movie)
            .Include(m => m.Book)
            .Include(m => m.TvSeries)
                .ThenInclude(tv => tv!.Seasons.Where(s => !s.IsDeleted))
                .ThenInclude(s => s.Episodes.Where(e => !e.IsDeleted))
            .FirstOrDefaultAsync(m => m.Id == id);

        if (m == null && throwIfMissing)
            throw new KeyNotFoundException($"Media {id} not found.");

        return m!;
    }

    private static MediaDetailDto MapToDetail(MediaEntity m)
    {
        var dto = new MediaDetailDto
        {
            Id            = m.Id,
            Type          = m.Type.ToString(),
            Title         = m.Title,
            Description   = m.Description,
            CoverUrl      = m.CoverUrl,
            ReleaseYear   = m.ReleaseDate?.Year,
            AverageRating = m.AverageRating,
            RatingsCount  = m.RatingsCount,
            Genres        = m.MediaGenres.Select(mg => mg.Genre.Name).ToList(),
            Tags          = m.MediaTags.Select(mt => mt.Tag.Name).ToList(),
        };

        if (m.Movie != null)
        {
            dto.Director = m.Movie.Director;
            dto.Duration = m.Movie.Duration;
            dto.TmdbId = m.Movie.TmdbId;
        }

        if (m.Book != null)
        {
            dto.Author = m.Book.Author;
            dto.Pages  = m.Book.Pages;
            dto.Isbn   = m.Book.Isbn;
            dto.OlId   = m.Book.OlId;
        }

        if (m.TvSeries != null)
        {
            dto.TmdbId = m.TvSeries.TmdbId;
            dto.SeasonsCount = m.TvSeries.SeasonsCount ?? m.TvSeries.Seasons.Count;
            dto.Seasons = m.TvSeries.Seasons
                .OrderBy(s => s.SeasonNumber)
                .Select(s => new SeasonDto
                {
                    Id           = s.Id,
                    SeasonNumber = s.SeasonNumber,
                    Episodes     = s.Episodes
                        .OrderBy(e => e.EpisodeNumber)
                        .Select(e => new EpisodeDto
                        {
                            Id            = e.Id,
                            EpisodeNumber = e.EpisodeNumber,
                            Title         = e.Title,
                            Duration      = e.Duration,
                        })
                        .ToList(),
                })
                .ToList();
        }

        return dto;
    }
}
