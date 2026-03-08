namespace RateOple.Core.Contracts.DTOs.Media;

/// <summary>
/// What the frontend receives from our Open Library proxy — clean, no raw OL shape exposed.
/// Mirrors the TmdbSearchResultDto / TmdbDetailsDto pattern exactly.
/// </summary>
public class OlSearchResultDto
{
    public string OlId { get; set; } = null!;       // e.g. "/works/OL45804W"
    public string Title { get; set; } = null!;
    public int? ReleaseYear { get; set; }
    public string? CoverUrl { get; set; }
    public string? Description { get; set; }
    public string? Author { get; set; }
}

public class OlDetailsDto : OlSearchResultDto
{
    public string? Isbn { get; set; }
    public int? Pages { get; set; }
    public List<string> Genres { get; set; } = [];
}