using RateOple.Constants.Enums;

namespace RateOple.Core.Media.DTOs;

public class MediaDetailsDto
{
    public Guid Id { get; set; }
    public MediaType Type { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime? ReleaseDate { get; set; }

    // Type-specific
    public int? Duration { get; set; }        // Movie
    public string? Director { get; set; }

    public string? Author { get; set; }        // Book
    public int? Pages { get; set; }

    public int? SeasonsCount { get; set; }     // TV
}
