using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Models;

public class Media
{
    public Guid Id { get; set; }

    public MediaType Type { get; set; }

    public string Title { get; set; } = null!;
    public string? Description { get; set; }

    public DateTime? ReleaseDate { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Movie? Movie { get; set; }
    public Book? Book { get; set; }
    public TvSeries? TvSeries { get; set; }
}
