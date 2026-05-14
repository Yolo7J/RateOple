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
    private const string DeletedUserDisplayName = "Deleted user";
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IModerationAuditService? _auditService;

    public UserProfileService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IModerationAuditService? auditService = null)
    {
        _context = context;
        _userManager = userManager;
        _auditService = auditService;
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
            if (user.IsDeleted)
                throw new KeyNotFoundException("User not found.");

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

        var profileUser = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsDeleted })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("User not found.");
        if (profileUser.IsDeleted)
            throw new KeyNotFoundException("User not found.");

        return Map(profile);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateUserProfileDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("User not found.");
        if (user.IsDeleted)
            throw new KeyNotFoundException("User not found.");

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
        if (user.IsDeleted)
            throw new KeyNotFoundException("User not found.");

        var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task DeleteAccountAsync(Guid userId, string currentPassword)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        if (user.IsDeleted)
            throw new KeyNotFoundException("User not found.");

        var passwordValid = await _userManager.CheckPasswordAsync(user, currentPassword);
        if (!passwordValid)
            throw new UnauthorizedAccessException("Invalid password.");

        await using var tx = await _context.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;

        await TransferOrArchiveOwnedGroupsAsync(userId, now);
        await DeleteUserOwnedCollectionsAsync(userId);

        var follows = await _context.Follows
            .Where(f => f.FollowerId == userId || f.FollowingId == userId)
            .ToListAsync();
        _context.Follows.RemoveRange(follows);

        var followedCollections = await _context.FollowCollections
            .Where(f => f.UserId == userId)
            .ToListAsync();
        _context.FollowCollections.RemoveRange(followedCollections);

        var memberships = await _context.GroupMemberships
            .Where(m => m.UserId == userId)
            .ToListAsync();
        _context.GroupMemberships.RemoveRange(memberships);

        var refreshTokens = await _context.RefreshTokens
            .Where(t => t.UserId == userId)
            .ToListAsync();
        foreach (var token in refreshTokens)
            token.Revoked = true;

        var externalLogins = await _context.UserLogins
            .Where(login => login.UserId == userId)
            .ToListAsync();
        _context.UserLogins.RemoveRange(externalLogins);

        _context.UserMediaStatuses.RemoveRange(await _context.UserMediaStatuses.Where(s => s.UserId == userId).ToListAsync());
        _context.UserGenreScores.RemoveRange(await _context.UserGenreScores.Where(s => s.UserId == userId).ToListAsync());
        _context.MediaInteractions.RemoveRange(await _context.MediaInteractions.Where(i => i.UserId == userId).ToListAsync());
        _context.Notifications.RemoveRange(await _context.Notifications.Where(n => n.UserId == userId).ToListAsync());

        var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new UserProfile { UserId = userId };
            _context.UserProfiles.Add(profile);
        }

        profile.DisplayName = DeletedUserDisplayName;
        profile.Bio = null;
        profile.AvatarUrl = null;
        profile.Location = null;
        profile.FavoriteGenres = null;
        profile.PrivacySetting = PrivacySetting.Private;
        profile.UpdatedAt = now;

        user.UserName = $"deleted_{userId:N}";
        user.NormalizedUserName = user.UserName.ToUpperInvariant();
        user.Email = null;
        user.NormalizedEmail = null;
        user.Bio = null;
        user.AvatarUrl = UserConstants.DefaultAvatarUrl;
        user.Visibility = UserVisibility.Private;
        user.IsDeleted = true;
        user.DeletedAt = now;
        user.DeletedReason = "UserRequested";
        user.PasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString();
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        await _context.SaveChangesAsync();

        if (_auditService != null)
        {
            await _auditService.LogAsync(
                ModerationAuditAction.UserAccountDeleted,
                userId,
                userId,
                notes: "User-requested account deletion anonymized the account.");
        }

        await tx.CommitAsync();
    }

    private async Task TransferOrArchiveOwnedGroupsAsync(Guid deletingUserId, DateTime now)
    {
        var groups = await _context.Groups
            .Where(g => g.OwnerId == deletingUserId)
            .OrderBy(g => g.CreatedAt)
            .ToListAsync();

        foreach (var group in groups)
        {
            var successor = await FindOwnershipSuccessorAsync(group.Id, deletingUserId);
            if (successor == null)
            {
                group.IsArchived = true;
                group.ArchivedAt = now;
                group.Visibility = GroupVisibility.Private;

                if (_auditService != null)
                {
                    await _auditService.LogAsync(
                        ModerationAuditAction.GroupArchived,
                        deletingUserId,
                        group.Id,
                        ModeratorScopeType.Group,
                        group.Id,
                        "Owner deleted their account and no eligible successor was available.");
                }

                continue;
            }

            group.OwnerId = successor.UserId;
            successor.Role = GroupRole.Owner;

            if (_auditService != null)
            {
                await _auditService.LogAsync(
                    ModerationAuditAction.GroupOwnershipTransferred,
                    deletingUserId,
                    successor.UserId,
                    ModeratorScopeType.Group,
                    group.Id,
                    $"Owner deleted their account; ownership transferred to {successor.UserId}.");
            }
        }
    }

    private async Task<GroupMembership?> FindOwnershipSuccessorAsync(Guid groupId, Guid deletingUserId)
    {
        var now = DateTimeOffset.UtcNow;
        var bannedUserIds = await _context.GroupBans
            .AsNoTracking()
            .Where(b => b.GroupId == groupId && b.RevokedAt == null)
            .Select(b => b.UserId)
            .ToHashSetAsync();

        var eligible = await _context.GroupMemberships
            .Include(m => m.User)
            .Where(m => m.GroupId == groupId && m.UserId != deletingUserId)
            .ToListAsync();

        return eligible
            .Where(m =>
                m.User.EmailConfirmed &&
                !m.User.IsDeleted &&
                !m.User.IsSuspended &&
                (m.User.LockoutEnd == null || m.User.LockoutEnd <= now) &&
                !bannedUserIds.Contains(m.UserId))
            .OrderBy(m => m.Role == GroupRole.GroupAdmin ? 0
                : m.Role == GroupRole.GroupModerator ? 1
                : m.Role == GroupRole.Member ? 2
                : 3)
            .ThenBy(m => m.JoinedAt)
            .FirstOrDefault();
    }

    private async Task DeleteUserOwnedCollectionsAsync(Guid userId)
    {
        var rootIds = await _context.Collections
            .Where(c => c.OwnerType == CollectionOwnerType.User && c.OwnerId == userId)
            .Select(c => c.Id)
            .ToListAsync();

        if (rootIds.Count == 0)
            return;

        var deleteIds = new HashSet<Guid>(rootIds);
        var frontier = rootIds;
        while (frontier.Count > 0)
        {
            var next = await _context.Collections
                .Where(c => c.ParentCollectionId.HasValue && frontier.Contains(c.ParentCollectionId.Value))
                .Select(c => c.Id)
                .ToListAsync();

            frontier = next.Where(deleteIds.Add).ToList();
        }

        _context.CollectionItems.RemoveRange(await _context.CollectionItems
            .Where(i => deleteIds.Contains(i.CollectionId))
            .ToListAsync());
        _context.FollowCollections.RemoveRange(await _context.FollowCollections
            .Where(f => deleteIds.Contains(f.CollectionId))
            .ToListAsync());

        var collections = await _context.Collections
            .Where(c => deleteIds.Contains(c.Id))
            .ToListAsync();
        _context.Collections.RemoveRange(collections);
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
