namespace RateOple.Infrastructure.Data.Models;

public class Book
{
    public Guid MediaId { get; set; }
    public string? Author { get; set; }
    public int? Pages { get; set; }
    public string? Isbn { get; set; }
    public string? OlId { get; set; }       // Open Library ID e.g. "OL7353617M"

    // Navigation
    public Media Media { get; set; } = null!;
}