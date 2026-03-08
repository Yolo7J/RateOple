namespace RateOple.Core.Users.DTOs;

public class UserFavoriteGenreDto
{
    public int GenreId { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Score { get; set; }
}
