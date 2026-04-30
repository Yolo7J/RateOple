using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Media.DTOs;

// ── List view (card) ──────────────────────────────────────────────────────────

public class MediaListItemDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = null!;       // "Movie" | "Book" | "TvSeries"
    public string Title { get; set; } = null!;
    public int? ReleaseYear { get; set; }
    public string? CoverUrl { get; set; }
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
    public List<string> Genres { get; set; } = [];
    public List<string> Tags { get; set; } = [];
}

// ── Detail view ───────────────────────────────────────────────────────────────

public class MediaDetailDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
    public List<string> Genres { get; set; } = [];
    public List<string> Tags { get; set; } = [];

    // Movie-specific
    public string? Director { get; set; }
    public int? Duration { get; set; }
    public int? TmdbId { get; set; }

    // Book-specific
    public string? Author { get; set; }
    public int? Pages { get; set; }
    public string? Isbn { get; set; }
    public string? OlId { get; set; }

    // TvSeries-specific
    public int? SeasonsCount { get; set; }
    public List<SeasonDto> Seasons { get; set; } = [];
}

public class SeasonDto
{
    public Guid Id { get; set; }
    public int SeasonNumber { get; set; }
    public List<EpisodeDto> Episodes { get; set; } = [];
}

public class EpisodeDto
{
    public Guid Id { get; set; }
    public int EpisodeNumber { get; set; }
    public string Title { get; set; } = null!;
    public int? Duration { get; set; }
}

// ── Create commands ───────────────────────────────────────────────────────────

public class CreateMovieDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;
    [MaxLength(4000)]
    public string? Description { get; set; }
    [Url]
    [MaxLength(2048)]
    public string? CoverUrl { get; set; }
    [Range(1800, 2200)]
    public int? ReleaseYear { get; set; }
    [MaxLength(200)]
    public string? Director { get; set; }
    [Range(1, 1000)]
    public int? Duration { get; set; }
    [Range(1, int.MaxValue)]
    public int? TmdbId { get; set; }
    public List<int> GenreIds { get; set; } = [];
}

public class CreateBookDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;
    [MaxLength(4000)]
    public string? Description { get; set; }
    [Url]
    [MaxLength(2048)]
    public string? CoverUrl { get; set; }
    [Range(1000, 2200)]
    public int? ReleaseYear { get; set; }
    [MaxLength(200)]
    public string? Author { get; set; }
    [Range(1, 100000)]
    public int? Pages { get; set; }
    [MaxLength(32)]
    public string? Isbn { get; set; }
    [MaxLength(128)]
    public string? OlId { get; set; }
    public List<int> GenreIds { get; set; } = [];
}

public class CreateTvSeriesDto
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;
    [MaxLength(4000)]
    public string? Description { get; set; }
    [Url]
    [MaxLength(2048)]
    public string? CoverUrl { get; set; }
    [Range(1900, 2200)]
    public int? ReleaseYear { get; set; }
    [Range(1, int.MaxValue)]
    public int? TmdbId { get; set; }
    public List<int> GenreIds { get; set; } = [];

    /// <summary>
    /// Full season+episode tree imported from TMDB (or entered manually).
    /// Empty list = series saved without seasons (can be added later).
    /// </summary>
    public List<CreateSeasonDto> Seasons { get; set; } = [];
}

public class CreateSeasonDto
{
    [Range(0, 1000)]
    public int SeasonNumber { get; set; }
    public List<CreateEpisodeDto> Episodes { get; set; } = [];
}

public class CreateEpisodeDto
{
    [Range(1, 10000)]
    public int EpisodeNumber { get; set; }
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;
    [Range(1, 1000)]
    public int? Duration { get; set; }
}

// ── Bulk create (cart submission) ─────────────────────────────────────────────

public class BulkCreateDto
{
    public List<CreateMovieDto> Movies { get; set; } = [];
    public List<CreateBookDto> Books { get; set; } = [];
    public List<CreateTvSeriesDto> TvSeries { get; set; } = [];
}

public class BulkCreateResultDto
{
    public List<MediaDetailDto> Created { get; set; } = [];
    public List<BulkCreateErrorDto> Errors { get; set; } = [];
}

public class BulkCreateErrorDto
{
    public string Title { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string Reason { get; set; } = null!;
}

// ── Query parameters ──────────────────────────────────────────────────────────

public class MediaQueryDto
{
    public List<string>? Types { get; set; }
    public List<int>? GenreIds { get; set; }
    public List<int>? TagIds { get; set; }
    [MaxLength(120)]
    public string? Search { get; set; }
    [RegularExpression("^(rating|year|title)$")]
    public string SortBy { get; set; } = "rating";
    [RegularExpression("^(asc|desc)$")]
    public string SortDir { get; set; } = "desc";
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 24;
}

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
