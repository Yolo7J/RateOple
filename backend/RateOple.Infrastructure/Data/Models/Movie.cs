namespace RateOple.Infrastructure.Data.Models;

public class Movie
{
    public Guid MediaId { get; set; }

    public int? Duration { get; set; }
    public string? Director { get; set; }

    public Media Media { get; set; } = null!;
}
