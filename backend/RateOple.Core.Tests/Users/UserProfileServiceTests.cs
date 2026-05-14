using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Core.Users.DTOs;
using RateOple.Core.Users.Services;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.Users;

public class UserProfileServiceTests
{
    [Fact]
    public async Task GetProfileAsync_ReturnsExistingProfile()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("profile-user"));
        data.Users.Profile(user, "Profile User");
        await data.SaveAsync();
        var service = await CreateServiceAsync(db);

        var profile = await service.GetProfileAsync(user.Id);

        Assert.Equal(user.Id, profile.UserId);
        Assert.Equal("Profile User", profile.DisplayName);
    }

    [Fact]
    public async Task GetProfileAsync_FallsBackToUserFieldsWhenProfileMissing()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("fallback-user"));
        user.Bio = "old bio";
        await data.SaveAsync();
        var service = await CreateServiceAsync(db);

        var profile = await service.GetProfileAsync(user.Id);

        Assert.Equal("fallback-user", profile.DisplayName);
        Assert.Equal("old bio", profile.Bio);
        Assert.Equal(PrivacySetting.Public, profile.PrivacySetting);
    }

    [Fact]
    public async Task UpdateProfileAsync_UpdatesProfileAndKeepsUserFieldsInSync()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("update-user"));
        await data.SaveAsync();
        var service = await CreateServiceAsync(db);

        var profile = await service.UpdateProfileAsync(user.Id, new UpdateUserProfileDto
        {
            DisplayName = " Updated User ",
            Bio = " new bio ",
            AvatarUrl = " https://example.test/avatar.png ",
            Location = " Sofia ",
            FavoriteGenres = " Drama ",
            PrivacySetting = PrivacySetting.Private
        });

        Assert.Equal("Updated User", profile.DisplayName);
        Assert.Equal("new bio", profile.Bio);
        Assert.Equal("https://example.test/avatar.png", profile.AvatarUrl);
        Assert.Equal("Sofia", profile.Location);
        Assert.Equal("Drama", profile.FavoriteGenres);
        Assert.Equal(PrivacySetting.Private, profile.PrivacySetting);

        var reloaded = await db.Context.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal("new bio", reloaded.Bio);
        Assert.Equal("https://example.test/avatar.png", reloaded.AvatarUrl);
        Assert.Equal(UserVisibility.Private, reloaded.Visibility);
    }

    [Fact]
    public async Task UpdateProfileAsync_NonexistentUserThrows()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = await CreateServiceAsync(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateProfileAsync(
            Guid.NewGuid(),
            new UpdateUserProfileDto { DisplayName = "Missing" }));
    }

    [Fact]
    public async Task DeleteAccountAsync_RejectsInvalidPassword()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var user = new TestUsers(db.Context).Normal("delete-user");
        var result = await manager.CreateAsync(user, "Password1");
        Assert.True(result.Succeeded);
        var service = new UserProfileService(db.Context, manager);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteAccountAsync(user.Id, "WrongPassword1"));

        var reloaded = await db.Context.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal("delete-user", reloaded.UserName);
    }

    [Fact]
    public async Task DeleteAccountAsync_AnonymizesAccountAndCleansPersonalData()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Normal("delete-me");
        var createResult = await manager.CreateAsync(user, "Password1");
        Assert.True(createResult.Succeeded);

        data.Users.Profile(user, "Delete Me").Location = "Sofia";
        data.Users.RefreshToken(user, "hash-1");
        var follower = data.Users.Add(data.Users.Normal("collection-follower"));
        var media = data.Media.Movie("Deletion Movie");
        var collection = data.Collections.UserCollection(user, "Personal Collection");
        var childCollection = data.Collections.UserCollection(user, "Nested Collection", collection);
        data.Collections.Item(childCollection, media);
        data.Collections.Follow(follower, childCollection);
        var group = data.Groups.Group(user, "Owned Group");
        var newOwner = data.Users.Add(data.Users.Normal("new-owner"));
        data.Groups.Membership(group, newOwner, GroupRole.GroupAdmin);
        var post = data.Groups.Post(group, user);
        var rating = data.Rating(user.Id, media.Id, 9);
        db.Context.Reviews.Add(new Review
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            MediaId = media.Id,
            RatingId = rating.Id,
            Content = "review",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        data.GroupPostComment(user.Id, post.Id, "comment");
        await data.SaveAsync();
        var service = new UserProfileService(db.Context, manager, new ModerationAuditService(db.Context));

        await service.DeleteAccountAsync(user.Id, "Password1");

        var deletedUser = await db.Context.Users.SingleAsync(u => u.Id == user.Id);
        Assert.StartsWith($"deleted_{user.Id:N}", deletedUser.UserName);
        Assert.Null(deletedUser.Email);
        Assert.True(deletedUser.IsDeleted);
        Assert.NotNull(deletedUser.DeletedAt);
        Assert.Equal("UserRequested", deletedUser.DeletedReason);
        Assert.Null(deletedUser.PasswordHash);
        Assert.Null(deletedUser.Bio);
        Assert.Equal(UserConstants.DefaultAvatarUrl, deletedUser.AvatarUrl);
        Assert.Equal(UserVisibility.Private, deletedUser.Visibility);
        Assert.True(deletedUser.LockoutEnabled);
        Assert.NotNull(deletedUser.LockoutEnd);

        var deletedProfile = await db.Context.UserProfiles.SingleAsync(p => p.UserId == user.Id);
        Assert.Equal("Deleted user", deletedProfile.DisplayName);
        Assert.Null(deletedProfile.Bio);
        Assert.Null(deletedProfile.AvatarUrl);
        Assert.Null(deletedProfile.Location);
        Assert.Equal(PrivacySetting.Private, deletedProfile.PrivacySetting);
        Assert.True(await db.Context.RefreshTokens.Where(t => t.UserId == user.Id).AllAsync(t => t.Revoked));
        Assert.False(await db.Context.Collections.AnyAsync(c => c.Id == collection.Id));
        Assert.False(await db.Context.Collections.AnyAsync(c => c.Id == childCollection.Id));
        Assert.False(await db.Context.CollectionItems.AnyAsync(i => i.CollectionId == childCollection.Id));
        Assert.False(await db.Context.FollowCollections.AnyAsync(f => f.CollectionId == childCollection.Id));

        Assert.True(await db.Context.Reviews.AnyAsync(r => r.UserId == user.Id));
        Assert.Equal(user.Id, await db.Context.Ratings.Where(r => r.Id == rating.Id).Select(r => r.UserId).SingleAsync());
        Assert.Equal(user.Id, await db.Context.Comments.Where(c => c.GroupPostId == post.Id).Select(c => c.UserId).SingleAsync());
        Assert.Equal(user.Id, await db.Context.GroupPosts.Where(p => p.Id == post.Id).Select(p => p.UserId).SingleAsync());
        Assert.False(await db.Context.GroupMemberships.AnyAsync(m => m.GroupId == group.Id && m.UserId == user.Id));
        Assert.Equal(newOwner.Id, await db.Context.Groups.Where(g => g.Id == group.Id).Select(g => g.OwnerId).SingleAsync());
        Assert.Equal(GroupRole.Owner, await db.Context.GroupMemberships.Where(m => m.GroupId == group.Id && m.UserId == newOwner.Id).Select(m => m.Role).SingleAsync());
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(l => l.Action == ModerationAuditAction.UserAccountDeleted && l.TargetId == user.Id));
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(l => l.Action == ModerationAuditAction.GroupOwnershipTransferred && l.ScopeId == group.Id));
    }

    [Fact]
    public async Task DeleteAccountAsync_TransfersOwnedGroupByAdminModeratorMemberPriority()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Normal("priority-owner");
        var createResult = await manager.CreateAsync(owner, "Password1");
        Assert.True(createResult.Succeeded);
        var member = data.Users.Add(data.Users.Normal("eligible-member"));
        var moderator = data.Users.Add(data.Users.Normal("eligible-mod"));
        var newestAdmin = data.Users.Add(data.Users.Normal("newest-admin"));
        var oldestAdmin = data.Users.Add(data.Users.Normal("oldest-admin"));
        var group = data.Groups.Group(owner, "Priority Group");
        data.Groups.Membership(group, member, GroupRole.Member).JoinedAt = DateTime.UtcNow.AddDays(-10);
        data.Groups.Membership(group, moderator, GroupRole.GroupModerator).JoinedAt = DateTime.UtcNow.AddDays(-8);
        data.Groups.Membership(group, newestAdmin, GroupRole.GroupAdmin).JoinedAt = DateTime.UtcNow.AddDays(-1);
        data.Groups.Membership(group, oldestAdmin, GroupRole.GroupAdmin).JoinedAt = DateTime.UtcNow.AddDays(-3);
        await data.SaveAsync();
        var service = new UserProfileService(db.Context, manager, new ModerationAuditService(db.Context));

        await service.DeleteAccountAsync(owner.Id, "Password1");

        Assert.Equal(oldestAdmin.Id, await db.Context.Groups.Where(g => g.Id == group.Id).Select(g => g.OwnerId).SingleAsync());
        Assert.Equal(GroupRole.Owner, await db.Context.GroupMemberships.Where(m => m.GroupId == group.Id && m.UserId == oldestAdmin.Id).Select(m => m.Role).SingleAsync());
    }

    [Fact]
    public async Task DeleteAccountAsync_FallsBackToModeratorThenMember()
    {
        await using var moderatorDb = await SqliteTestDb.CreateAsync();
        await AssertDeletionTransfersToRoleAsync(moderatorDb, GroupRole.GroupModerator);

        await using var memberDb = await SqliteTestDb.CreateAsync();
        await AssertDeletionTransfersToRoleAsync(memberDb, GroupRole.Member);
    }

    [Fact]
    public async Task DeleteAccountAsync_ArchivesOwnedGroupWhenNoEligibleSuccessor()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Normal("archive-owner");
        var createResult = await manager.CreateAsync(owner, "Password1");
        Assert.True(createResult.Succeeded);
        var suspendedMember = data.Users.Add(data.Users.Normal("suspended-member"));
        suspendedMember.IsSuspended = true;
        var group = data.Groups.Group(owner, "Archived Group");
        data.Groups.Membership(group, suspendedMember);
        await data.SaveAsync();
        var service = new UserProfileService(db.Context, manager, new ModerationAuditService(db.Context));

        await service.DeleteAccountAsync(owner.Id, "Password1");

        var archived = await db.Context.Groups.SingleAsync(g => g.Id == group.Id);
        Assert.True(archived.IsArchived);
        Assert.NotNull(archived.ArchivedAt);
        Assert.Equal(GroupVisibility.Private, archived.Visibility);
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(l => l.Action == ModerationAuditAction.GroupArchived && l.TargetId == group.Id));
    }

    [Fact]
    public async Task DeleteAccountAsync_NonexistentUserThrows()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = await CreateServiceAsync(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.DeleteAccountAsync(Guid.NewGuid(), "Password1"));
    }

    [Fact]
    public async Task ChangePasswordAsync_UsesIdentityRules()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var user = new TestUsers(db.Context).Normal("password-user");
        var result = await manager.CreateAsync(user, "Password1");
        Assert.True(result.Succeeded);
        var service = new UserProfileService(db.Context, manager);

        await service.ChangePasswordAsync(user.Id, "Password1", "Password2");

        Assert.True(await manager.CheckPasswordAsync(user, "Password2"));
    }

    private static async Task<UserProfileService> CreateServiceAsync(SqliteTestDb db)
    {
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        return new UserProfileService(db.Context, manager);
    }

    private static async Task AssertDeletionTransfersToRoleAsync(SqliteTestDb db, GroupRole role)
    {
        var manager = await TestUsers.CreateUserManagerAsync(db.Context);
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Normal($"owner-{role}");
        var createResult = await manager.CreateAsync(owner, "Password1");
        Assert.True(createResult.Succeeded);
        var successor = data.Users.Add(data.Users.Normal($"successor-{role}"));
        var group = data.Groups.Group(owner, $"{role} Group");
        data.Groups.Membership(group, successor, role);
        await data.SaveAsync();
        var service = new UserProfileService(db.Context, manager, new ModerationAuditService(db.Context));

        await service.DeleteAccountAsync(owner.Id, "Password1");

        Assert.Equal(successor.Id, await db.Context.Groups.Where(g => g.Id == group.Id).Select(g => g.OwnerId).SingleAsync());
        Assert.Equal(GroupRole.Owner, await db.Context.GroupMemberships.Where(m => m.GroupId == group.Id && m.UserId == successor.Id).Select(m => m.Role).SingleAsync());
    }
}
