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
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public string? Director { get; set; }
    public int? Duration { get; set; }
    public int? TmdbId { get; set; }
    public List<int> GenreIds { get; set; } = [];
}

public class CreateBookDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public string? Author { get; set; }
    public int? Pages { get; set; }
    public string? Isbn { get; set; }
    public string? OlId { get; set; }
    public List<int> GenreIds { get; set; } = [];
}

public class CreateTvSeriesDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
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
    public int SeasonNumber { get; set; }
    public List<CreateEpisodeDto> Episodes { get; set; } = [];
}

public class CreateEpisodeDto
{
    public int EpisodeNumber { get; set; }
    public string Title { get; set; } = null!;
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
    public string? Search { get; set; }
    public string SortBy { get; set; } = "rating";
    public string SortDir { get; set; } = "desc";
    public int Page { get; set; } = 1;
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
