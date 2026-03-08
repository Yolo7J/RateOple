namespace RateOple.Infrastructure.Data.Entities;

public class UserGenreScore
{
    public Guid UserId { get; set; }
    public int GenreId { get; set; }
    public double Score { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Genre Genre { get; set; } = null!;
}
