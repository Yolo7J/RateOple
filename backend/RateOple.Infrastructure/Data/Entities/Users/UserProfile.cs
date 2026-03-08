using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class UserProfile
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = null!;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Location { get; set; }
    public string? FavoriteGenres { get; set; }
    public PrivacySetting PrivacySetting { get; set; } = PrivacySetting.Public;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
