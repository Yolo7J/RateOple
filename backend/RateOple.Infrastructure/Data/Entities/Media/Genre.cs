namespace RateOple.Infrastructure.Data.Entities
{
public class Genre
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;

    // Navigation
    public ICollection<MediaGenre> MediaGenres { get; set; } = new List<MediaGenre>();
    public ICollection<UserGenreScore> UserScores { get; set; } = new List<UserGenreScore>();
}
}
