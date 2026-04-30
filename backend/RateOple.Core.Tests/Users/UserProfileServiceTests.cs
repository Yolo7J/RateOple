using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
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

        data.Users.Profile(user, "Delete Me");
        data.Users.RefreshToken(user, "hash-1");
        var media = data.Media.Movie("Deletion Movie");
        var collection = data.Collections.UserCollection(user, "Personal Collection");
        var group = data.Groups.Group(user, "Owned Group");
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
        var service = new UserProfileService(db.Context, manager);

        await service.DeleteAccountAsync(user.Id, "Password1");

        var deletedUser = await db.Context.Users.SingleAsync(u => u.Id == user.Id);
        Assert.StartsWith($"deleted_{user.Id:N}", deletedUser.UserName);
        Assert.Null(deletedUser.Email);
        Assert.Null(deletedUser.PasswordHash);
        Assert.Null(deletedUser.Bio);
        Assert.Equal(UserConstants.DefaultAvatarUrl, deletedUser.AvatarUrl);
        Assert.Equal(UserVisibility.Private, deletedUser.Visibility);
        Assert.True(deletedUser.LockoutEnabled);
        Assert.NotNull(deletedUser.LockoutEnd);

        Assert.False(await db.Context.UserProfiles.AnyAsync(p => p.UserId == user.Id));
        Assert.False(await db.Context.RefreshTokens.AnyAsync(t => t.UserId == user.Id));
        Assert.False(await db.Context.Collections.AnyAsync(c => c.Id == collection.Id));
        Assert.False(await db.Context.Reviews.AnyAsync(r => r.UserId == user.Id));

        Assert.Null(await db.Context.Ratings.Where(r => r.Id == rating.Id).Select(r => r.UserId).SingleAsync());
        Assert.Null(await db.Context.Comments.Where(c => c.GroupPostId == post.Id).Select(c => c.UserId).SingleAsync());
        Assert.Null(await db.Context.GroupPosts.Where(p => p.Id == post.Id).Select(p => p.UserId).SingleAsync());
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
}
