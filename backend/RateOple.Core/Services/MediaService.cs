using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Core.Services;

public class MediaService : IMediaService
{
    private readonly ApplicationDbContext _db;

    public MediaService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResultDto<MediaListItemDto>> GetAllAsync(MediaQueryDto query)
    {
        var q = _db.Media
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .AsQueryable();

        // Filter by type
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

        // Filter by genre
        if (query.GenreIds != null && query.GenreIds.Count > 0)
            q = q.Where(m => m.MediaGenres.Any(mg => query.GenreIds.Contains(mg.GenreId)));

        // Search
        if (!string.IsNullOrWhiteSpace(query.Search))
            q = q.Where(m => m.Title.ToLower().Contains(query.Search.ToLower()));

        // Sort
        q = (query.SortBy, query.SortDir) switch
        {
            ("year", "asc")    => q.OrderBy(m => m.ReleaseDate),
            ("year", "desc")   => q.OrderByDescending(m => m.ReleaseDate),
            ("title", "asc")   => q.OrderBy(m => m.Title),
            ("title", "desc")  => q.OrderByDescending(m => m.Title),
            ("rating", "asc")  => q.OrderBy(m => m.AverageRating),
            _                  => q.OrderByDescending(m => m.AverageRating), // default: top rated
        };

        var totalCount = await q.CountAsync();

        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(m => new MediaListItemDto
            {
                Id = m.Id,
                Type = m.Type.ToString(),
                Title = m.Title,
                ReleaseYear = m.ReleaseDate != null ? m.ReleaseDate.Value.Year : null,
                CoverUrl = m.CoverUrl,
                AverageRating = m.AverageRating,
                RatingsCount = m.RatingsCount,
                Genres = m.MediaGenres.Select(mg => mg.Genre.Name).ToList(),
            })
            .ToListAsync();

        return new PagedResultDto<MediaListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<MediaDetailDto?> GetByIdAsync(Guid id)
    {
        var m = await _db.Media
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.Movie)
            .Include(m => m.Book)
            .Include(m => m.TvSeries)
                .ThenInclude(tv => tv!.Seasons)
                .ThenInclude(s => s.Episodes)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (m == null) return null;

        return MapToDetail(m);
    }

    public async Task<MediaDetailDto> CreateMovieAsync(CreateMovieDto dto)
    {
        var media = new Media
        {
            Id = Guid.NewGuid(),
            Type = MediaType.Movie,
            Title = dto.Title,
            Description = dto.Description,
            CoverUrl = dto.CoverUrl,
            ReleaseDate = dto.ReleaseYear.HasValue
            ? new DateTime(dto.ReleaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            : null,
            CreatedAt = DateTime.UtcNow,
        };

        media.Movie = new Movie
        {
            MediaId = media.Id,
            Director = dto.Director,
            Duration = dto.Duration,
            TmdbId = dto.TmdbId,
        };

        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        await _db.SaveChangesAsync();

        return MapToDetail(await GetWithIncludes(media.Id));
    }

    public async Task<MediaDetailDto> CreateBookAsync(CreateBookDto dto)
    {
        var media = new Media
        {
            Id = Guid.NewGuid(),
            Type = MediaType.Book,
            Title = dto.Title,
            Description = dto.Description,
            CoverUrl = dto.CoverUrl,
            ReleaseDate = dto.ReleaseYear.HasValue
                ? new DateTime(dto.ReleaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                : null,
            CreatedAt = DateTime.UtcNow,
        };

        media.Book = new Book
        {
            MediaId = media.Id,
            Author = dto.Author,
            Pages = dto.Pages,
            Isbn = dto.Isbn,
            OlId = dto.OlId,
        };

        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        await _db.SaveChangesAsync();

        return MapToDetail(await GetWithIncludes(media.Id));
    }

    public async Task<MediaDetailDto> CreateTvSeriesAsync(CreateTvSeriesDto dto)
    {
        var media = new Media
        {
            Id = Guid.NewGuid(),
            Type = MediaType.TvSeries,
            Title = dto.Title,
            Description = dto.Description,
            CoverUrl = dto.CoverUrl,
            ReleaseDate = dto.ReleaseYear.HasValue
                ? new DateTime(dto.ReleaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                : null,
            CreatedAt = DateTime.UtcNow,
        };

        media.TvSeries = new TvSeries
        {
            MediaId = media.Id,
            TmdbId = dto.TmdbId,
        };

        await AttachGenres(media, dto.GenreIds);
        _db.Media.Add(media);
        await _db.SaveChangesAsync();

        return MapToDetail(await GetWithIncludes(media.Id));
    }

    public async Task<List<GenreDto>> GetGenresAsync()
    {
        return await _db.Genres
            .OrderBy(g => g.Name)
            .Select(g => new GenreDto { Id = g.Id, Name = g.Name })
            .ToListAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task AttachGenres(Media media, List<int> genreIds)
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

    private async Task<Media> GetWithIncludes(Guid id)
    {
        return await _db.Media
            .Include(m => m.MediaGenres).ThenInclude(mg => mg.Genre)
            .Include(m => m.Movie)
            .Include(m => m.Book)
            .Include(m => m.TvSeries).ThenInclude(tv => tv!.Seasons).ThenInclude(s => s.Episodes)
            .FirstAsync(m => m.Id == id);
    }

    private static MediaDetailDto MapToDetail(Media m)
    {
        var dto = new MediaDetailDto
        {
            Id = m.Id,
            Type = m.Type.ToString(),
            Title = m.Title,
            Description = m.Description,
            CoverUrl = m.CoverUrl,
            ReleaseYear = m.ReleaseDate?.Year,
            AverageRating = m.AverageRating,
            RatingsCount = m.RatingsCount,
            Genres = m.MediaGenres.Select(mg => mg.Genre.Name).ToList(),
        };

        if (m.Movie != null)
        {
            dto.Director = m.Movie.Director;
            dto.Duration = m.Movie.Duration;
        }

        if (m.Book != null)
        {
            dto.Author = m.Book.Author;
            dto.Pages = m.Book.Pages;
            dto.Isbn = m.Book.Isbn;
        }

        if (m.TvSeries != null)
        {
            dto.SeasonsCount = m.TvSeries.SeasonsCount ?? m.TvSeries.Seasons.Count;
            dto.Seasons = m.TvSeries.Seasons
                .OrderBy(s => s.SeasonNumber)
                .Select(s => new SeasonDto
                {
                    Id = s.Id,
                    SeasonNumber = s.SeasonNumber,
                    Episodes = s.Episodes
                        .OrderBy(e => e.EpisodeNumber)
                        .Select(e => new EpisodeDto
                        {
                            Id = e.Id,
                            EpisodeNumber = e.EpisodeNumber,
                            Title = e.Title,
                            Duration = e.Duration,
                        })
                        .ToList(),
                })
                .ToList();
        }

        return dto;
    }
}