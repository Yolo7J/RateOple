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

        // Navigation Properties
        public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<Collection> Collections { get; set; } = new List<Collection>();
        public ICollection<Follow> Following { get; set; } = new List<Follow>();
        public ICollection<Follow> Followers { get; set; } = new List<Follow>();
        public ICollection<GroupMembership> GroupMemberships { get; set; } = new List<GroupMembership>();
        public ICollection<Group> OwnedGroups { get; set; } = new List<Group>();
        public ICollection<GroupPost> GroupPosts { get; set; } = new List<GroupPost>();
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
        public ICollection<MediaInteraction> MediaInteractions { get; set; } = new List<MediaInteraction>();
        public ICollection<UserGenreScore> GenreScores { get; set; } = new List<UserGenreScore>();
    }
}
