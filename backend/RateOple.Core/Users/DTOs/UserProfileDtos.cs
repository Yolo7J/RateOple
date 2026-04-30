using System.ComponentModel.DataAnnotations;
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
    [MaxLength(80)]
    public string? DisplayName { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    [Url]
    [MaxLength(2048)]
    public string? AvatarUrl { get; set; }

    [MaxLength(120)]
    public string? Location { get; set; }

    [MaxLength(500)]
    public string? FavoriteGenres { get; set; }

    [EnumDataType(typeof(PrivacySetting))]
    public PrivacySetting? PrivacySetting { get; set; }
}

public class ChangePasswordDto
{
    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
}

public class DeleteAccountDto
{
    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string CurrentPassword { get; set; } = string.Empty;
}
