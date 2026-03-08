using RateOple.Constants.Enums;

namespace RateOple.Core.Users.DTOs;

public class UserProfileDto
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Location { get; set; }
    public string? FavoriteGenres { get; set; }
    public PrivacySetting PrivacySetting { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateUserProfileDto
{
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Location { get; set; }
    public string? FavoriteGenres { get; set; }
    public PrivacySetting? PrivacySetting { get; set; }
}

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class DeleteAccountDto
{
    public string CurrentPassword { get; set; } = string.Empty;
}
