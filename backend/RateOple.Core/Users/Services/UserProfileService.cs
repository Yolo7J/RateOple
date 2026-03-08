using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Users.Services;

public class UserProfileService : IUserProfileService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;

    public UserProfileService(ApplicationDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new KeyNotFoundException("User not found.");

            return new UserProfileDto
            {
                UserId = user.Id,
                DisplayName = user.UserName ?? string.Empty,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl,
                PrivacySetting = user.Visibility == UserVisibility.Private
                    ? PrivacySetting.Private
                    : PrivacySetting.Public,
                UpdatedAt = user.CreatedAt
            };
        }

        return Map(profile);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateUserProfileDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("User not found.");

        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId,
                DisplayName = user.UserName ?? string.Empty,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl,
                PrivacySetting = user.Visibility == UserVisibility.Private
                    ? PrivacySetting.Private
                    : PrivacySetting.Public
            };
            _context.UserProfiles.Add(profile);
        }

        if (dto.DisplayName != null) profile.DisplayName = dto.DisplayName.Trim();
        if (dto.Bio != null) profile.Bio = dto.Bio.Trim();
        if (dto.AvatarUrl != null) profile.AvatarUrl = dto.AvatarUrl.Trim();
        if (dto.Location != null) profile.Location = dto.Location.Trim();
        if (dto.FavoriteGenres != null) profile.FavoriteGenres = dto.FavoriteGenres.Trim();
        if (dto.PrivacySetting.HasValue) profile.PrivacySetting = dto.PrivacySetting.Value;
        profile.UpdatedAt = DateTime.UtcNow;

        // Keep existing user fields in sync for backward compatibility.
        user.Bio = profile.Bio;
        user.AvatarUrl = string.IsNullOrWhiteSpace(profile.AvatarUrl)
            ? UserConstants.DefaultAvatarUrl
            : profile.AvatarUrl;
        user.Visibility = profile.PrivacySetting == PrivacySetting.Private
            ? UserVisibility.Private
            : UserVisibility.Public;

        await _context.SaveChangesAsync();
        return Map(profile);
    }

    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");

        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task DeleteAccountAsync(Guid userId, string currentPassword)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");

        var passwordValid = await _userManager.CheckPasswordAsync(user, currentPassword);
        if (!passwordValid)
            throw new UnauthorizedAccessException("Invalid password.");

        await using var tx = await _context.Database.BeginTransactionAsync();

        // Remove user-owned data.
        var collections = await _context.Collections.Where(c => c.OwnerId == userId).ToListAsync();
        _context.Collections.RemoveRange(collections);
        var follows = await _context.Follows
            .Where(f => f.FollowerId == userId || f.FollowingId == userId)
            .ToListAsync();
        _context.Follows.RemoveRange(follows);
        var memberships = await _context.GroupMemberships
            .Where(m => m.UserId == userId)
            .ToListAsync();
        _context.GroupMemberships.RemoveRange(memberships);
        var refreshTokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId)
            .ToListAsync();
        _context.RefreshTokens.RemoveRange(refreshTokens);
        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile != null)
            _context.UserProfiles.Remove(profile);

        // Remove reviews but keep ratings/comments/posts with anonymized author.
        var reviews = await _context.Reviews.Where(r => r.UserId == userId).ToListAsync();
        _context.Reviews.RemoveRange(reviews);

        var ratings = await _context.Ratings.Where(r => r.UserId == userId).ToListAsync();
        foreach (var rating in ratings) rating.UserId = null;

        var comments = await _context.Comments.Where(c => c.UserId == userId).ToListAsync();
        foreach (var comment in comments) comment.UserId = null;

        var posts = await _context.GroupPosts.Where(p => p.UserId == userId).ToListAsync();
        foreach (var post in posts) post.UserId = null;

        // Anonymize account and block login.
        user.UserName = $"deleted_{userId:N}";
        user.NormalizedUserName = user.UserName.ToUpperInvariant();
        user.Email = null;
        user.NormalizedEmail = null;
        user.Bio = null;
        user.AvatarUrl = UserConstants.DefaultAvatarUrl;
        user.Visibility = UserVisibility.Private;
        user.PasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();
    }

    private static UserProfileDto Map(UserProfile profile) => new()
    {
        UserId = profile.UserId,
        DisplayName = profile.DisplayName,
        Bio = profile.Bio,
        AvatarUrl = profile.AvatarUrl,
        Location = profile.Location,
        FavoriteGenres = profile.FavoriteGenres,
        PrivacySetting = profile.PrivacySetting,
        UpdatedAt = profile.UpdatedAt
    };
}
