using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Lookup;

public class LookupContractTests
{
    [Fact]
    public async Task MediaLookup_ExcludesDeletedMediaAndNormalizesPagination()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new RateOple.Infrastructure.Data.Entities.Media
            {
                Id = Guid.NewGuid(),
                Type = MediaType.Movie,
                Title = "Lookup Visible Movie",
                ReleaseDate = new DateTime(2010, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                AverageRating = 4.5,
                RatingsCount = 12,
                CreatedAt = DateTime.UtcNow
            });
            db.Media.Add(new RateOple.Infrastructure.Data.Entities.Media
            {
                Id = Guid.NewGuid(),
                Type = MediaType.Movie,
                Title = "Lookup Deleted Movie",
                IsDeleted = true,
                CreatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        var response = await client.GetAsync("/api/media/lookup?search=Lookup&page=0&pageSize=0");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = json.RootElement.GetProperty("items").EnumerateArray().ToList();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(items);
        Assert.Equal("Lookup Visible Movie", items[0].GetProperty("title").GetString());
        Assert.Equal("Movie · 2010", items[0].GetProperty("subtitle").GetString());
        Assert.Equal(1, json.RootElement.GetProperty("page").GetInt32());
        Assert.Equal(20, json.RootElement.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task UserLookup_IsPrivacySafeAndAdminLookupCanSearchEmail()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var publicUser = await factory.AddUserAsync("public-lookup-user", RoleConstants.User);
        var privateUser = await factory.AddUserAsync("private-lookup-user", RoleConstants.User);
        var admin = await factory.AddUserAsync("lookup-admin", RoleConstants.Admin);
        await factory.WithDbAsync(async db =>
        {
            var privateEntry = await db.Users.SingleAsync(u => u.Id == privateUser.Id);
            privateEntry.Visibility = UserVisibility.Private;
            db.UserProfiles.Add(new UserProfile
            {
                UserId = publicUser.Id,
                DisplayName = "Public Lookup Name",
                AvatarUrl = "https://example.test/avatar.png"
            });
        });

        var publicResponse = await client.GetAsync("/api/users/lookup?search=example.test");
        using var publicJson = JsonDocument.Parse(await publicResponse.Content.ReadAsStringAsync());

        using var adminRequest = new HttpRequestMessage(HttpMethod.Get, "/api/admin/users/lookup?search=private-lookup-user@example.test");
        ApiTestFactory.AddTestAuthHeaders(adminRequest, admin, RoleConstants.Admin);
        var adminResponse = await client.SendAsync(adminRequest);
        using var adminJson = JsonDocument.Parse(await adminResponse.Content.ReadAsStringAsync());
        var adminItems = adminJson.RootElement.GetProperty("items").EnumerateArray().ToList();

        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
        Assert.Empty(publicJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, adminResponse.StatusCode);
        Assert.Single(adminItems);
        Assert.Equal("private-lookup-user", adminItems[0].GetProperty("username").GetString());
        Assert.False(adminItems[0].TryGetProperty("email", out _));
    }

    [Fact]
    public async Task GroupLookup_RespectsPrivateVisibilityAndSearchesPublicGroups()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var owner = await factory.AddUserAsync("group-lookup-owner", RoleConstants.User);
        var member = await factory.AddUserAsync("group-lookup-member", RoleConstants.User);
        Guid privateGroupId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Groups.Add(new Group
            {
                Id = Guid.NewGuid(),
                Name = "Public Lookup Group",
                Visibility = GroupVisibility.Public,
                OwnerId = owner.Id,
                CreatedAt = DateTime.UtcNow
            });
            db.Groups.Add(new Group
            {
                Id = privateGroupId,
                Name = "Private Lookup Group",
                Visibility = GroupVisibility.Private,
                OwnerId = owner.Id,
                CreatedAt = DateTime.UtcNow
            });
            db.GroupMemberships.Add(new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = privateGroupId,
                UserId = member.Id,
                Role = GroupRole.Member,
                JoinedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        var anonymousResponse = await client.GetAsync("/api/groups/lookup?search=Lookup");
        using var anonymousJson = JsonDocument.Parse(await anonymousResponse.Content.ReadAsStringAsync());
        var anonymousItems = anonymousJson.RootElement.GetProperty("items").EnumerateArray().ToList();

        using var memberRequest = new HttpRequestMessage(HttpMethod.Get, "/api/groups/lookup?search=Lookup");
        ApiTestFactory.AddTestAuthHeaders(memberRequest, member, RoleConstants.User);
        var memberResponse = await client.SendAsync(memberRequest);
        using var memberJson = JsonDocument.Parse(await memberResponse.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, anonymousResponse.StatusCode);
        Assert.Single(anonymousItems);
        Assert.Equal("Public Lookup Group", anonymousItems[0].GetProperty("name").GetString());
        Assert.Equal(2, memberJson.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task CollectionLookup_RespectsPrivateVisibility()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var owner = await factory.AddUserAsync("collection-lookup-owner", RoleConstants.User);
        var follower = await factory.AddUserAsync("collection-lookup-follower", RoleConstants.User);
        Guid followersCollectionId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Collections.Add(new Collection
            {
                Id = Guid.NewGuid(),
                Name = "Public Lookup Collection",
                Title = "Public Lookup Collection",
                Visibility = CollectionVisibility.Public,
                OwnerType = CollectionOwnerType.User,
                OwnerId = owner.Id,
                CreatedAt = DateTime.UtcNow
            });
            db.Collections.Add(new Collection
            {
                Id = followersCollectionId,
                Name = "Followers Lookup Collection",
                Title = "Followers Lookup Collection",
                Visibility = CollectionVisibility.Followers,
                OwnerType = CollectionOwnerType.User,
                OwnerId = owner.Id,
                CreatedAt = DateTime.UtcNow
            });
            db.FollowCollections.Add(new FollowCollection
            {
                UserId = follower.Id,
                CollectionId = followersCollectionId,
                FollowedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        var anonymousResponse = await client.GetAsync("/api/collections/lookup?search=Lookup");
        using var anonymousJson = JsonDocument.Parse(await anonymousResponse.Content.ReadAsStringAsync());

        using var followerRequest = new HttpRequestMessage(HttpMethod.Get, "/api/collections/lookup?search=Lookup");
        ApiTestFactory.AddTestAuthHeaders(followerRequest, follower, RoleConstants.User);
        var followerResponse = await client.SendAsync(followerRequest);
        using var followerJson = JsonDocument.Parse(await followerResponse.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, anonymousResponse.StatusCode);
        Assert.Single(anonymousJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal(2, followerJson.RootElement.GetProperty("items").GetArrayLength());
    }
}
