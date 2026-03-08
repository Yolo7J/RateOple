namespace RateOple.Core.Media.DTOs;

// ── Update commands ───────────────────────────────────────────────────────────

public class UpdateMovieDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public string? Director { get; set; }
    public int? Duration { get; set; }
    public List<int>? GenreIds { get; set; }
}

public class UpdateBookDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public string? Author { get; set; }
    public int? Pages { get; set; }
    public string? Isbn { get; set; }
    public List<int>? GenreIds { get; set; }
}

public class UpdateTvSeriesDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
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
    public int EpisodeNumber { get; set; }
    public string? Title { get; set; }
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