namespace RateOple.Infrastructure.Data.Entities;

public class Movie
{
    public Guid MediaId { get; set; }
    public int? Duration { get; set; }       // minutes
    public string? Director { get; set; }
    public int? TmdbId { get; set; }

    // Navigation
    public Media Media { get; set; } = null!;
}