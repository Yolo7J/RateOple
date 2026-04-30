using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Media.DTOs;

// ── Update commands ───────────────────────────────────────────────────────────

public class UpdateMovieDto
{
    [MaxLength(200)]
    public string? Title { get; set; }
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
    public List<int>? GenreIds { get; set; }
}

public class UpdateBookDto
{
    [MaxLength(200)]
    public string? Title { get; set; }
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
    public List<int>? GenreIds { get; set; }
}

public class UpdateTvSeriesDto
{
    [MaxLength(200)]
    public string? Title { get; set; }
    [MaxLength(4000)]
    public string? Description { get; set; }
    [Url]
    [MaxLength(2048)]
    public string? CoverUrl { get; set; }
    [Range(1900, 2200)]
    public int? ReleaseYear { get; set; }
    public List<int>? GenreIds { get; set; }

    /// <summary>
    /// Seasons to upsert. Matched by SeasonNumber.
    /// Seasons not present in this list are left untouched.
    /// </summary>
    public List<UpsertSeasonDto> Seasons { get; set; } = [];
}

public class UpsertSeasonDto
{
    /// <summary>Used to match existing season. Required.</summary>
    [Range(0, 1000)]
    public int SeasonNumber { get; set; }

    /// <summary>
    /// Episodes to upsert. Matched by EpisodeNumber.
    /// Episodes not present are left untouched.
    /// </summary>
    public List<UpsertEpisodeDto> Episodes { get; set; } = [];
}

public class UpsertEpisodeDto
{
    /// <summary>Used to match existing episode. Required.</summary>
    [Range(1, 10000)]
    public int EpisodeNumber { get; set; }
    [MaxLength(200)]
    public string? Title { get; set; }
    [Range(1, 1000)]
    public int? Duration { get; set; }
}

// ── TvSeries-specific read DTOs (extended) ────────────────────────────────────

public class SeasonDetailDto
{
    public Guid Id { get; set; }
    public int SeasonNumber { get; set; }
    public List<EpisodeDetailDto> Episodes { get; set; } = [];
}

public class EpisodeDetailDto
{
    public Guid Id { get; set; }
    public int EpisodeNumber { get; set; }
    public string Title { get; set; } = null!;
    public int? Duration { get; set; }
}
