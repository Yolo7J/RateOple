namespace RateOple.Infrastructure.Data.Models
{
    public class Genre
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;

    // Navigation
    public ICollection<MediaGenre> MediaGenres { get; set; } = new List<MediaGenre>();
}
}