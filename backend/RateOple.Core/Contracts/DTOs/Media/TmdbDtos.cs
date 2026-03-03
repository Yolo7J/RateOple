namespace RateOple.Core.Contracts.DTOs.Media;

// What the frontend receives from our proxy — clean, minimal, no raw TMDB shape exposed
public class TmdbSearchResultDto
{
    public int TmdbId { get; set; }
    public string Title { get; set; } = null!;
    public int? ReleaseYear { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }
}

public class TmdbDetailsDto : TmdbSearchResultDto
{
    public string? Director { get; set; }       // movies only
    public int? Duration { get; set; }          // movies only (minutes)
    public List<string> Genres { get; set; } = [];
}