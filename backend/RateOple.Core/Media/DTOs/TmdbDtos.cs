namespace RateOple.Core.Contracts.DTOs.Media;

// ── Search / list ─────────────────────────────────────────────────────────────

// What the frontend receives from our proxy — clean, minimal, no raw TMDB shape exposed
public class TmdbSearchResultDto
{
    public int TmdbId { get; set; }
    public string Title { get; set; } = null!;
    public int? ReleaseYear { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }
}

// ── Movie details ─────────────────────────────────────────────────────────────

public class TmdbDetailsDto : TmdbSearchResultDto
{
    public string? Director { get; set; }       // movies only
    public int? Duration { get; set; }          // movies only (minutes)
    public List<string> Genres { get; set; } = [];
}

// ── TV Series details (includes full season+episode tree) ─────────────────────

public class TmdbSeriesDetailsDto : TmdbSearchResultDto
{
    public List<string> Genres { get; set; } = [];
    public List<TmdbSeasonDto> Seasons { get; set; } = [];
}

public class TmdbSeasonDto
{
    public int SeasonNumber { get; set; }
    public List<TmdbEpisodeDto> Episodes { get; set; } = [];
}

public class TmdbEpisodeDto
{
    public int EpisodeNumber { get; set; }
    public string Title { get; set; } = null!;
    public int? Duration { get; set; }          // runtime in minutes
}