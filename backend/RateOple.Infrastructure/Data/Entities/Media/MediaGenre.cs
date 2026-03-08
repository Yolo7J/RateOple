namespace RateOple.Infrastructure.Data.Entities;

public class MediaGenre
{
    public Guid MediaId { get; set; }
    public int GenreId { get; set; }

    // Navigation
    public Media Media { get; set; } = null!;
    public Genre Genre { get; set; } = null!;
}