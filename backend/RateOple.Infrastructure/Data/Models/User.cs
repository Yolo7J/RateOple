using Microsoft.AspNetCore.Identity;
using System;
using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;
using RateOple.Constants.Constants;

namespace RateOple.Infrastructure.Data.Models
{
    public class User : IdentityUser<Guid>
    {
        [Required]
        public UserVisibility Visibility { get; set; } = UserVisibility.Public;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(UserConstants.MaxBioLength)]
        public string? Bio { get; set; }

        [Required]
        public string AvatarUrl { get; set; } = UserConstants.DefaultAvatarUrl;

        [Required]
        public ThemeType PreferredTheme { get; set; } = UserConstants.DefaultTheme;

        [Required]
        public LanguageType PreferredLanguage { get; set; } = UserConstants.DefaultLanguage;
    }
}
