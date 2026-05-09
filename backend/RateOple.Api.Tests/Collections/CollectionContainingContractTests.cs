using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Collections;

public class CollectionContainingContractTests
{
    [Fact]
    public async Task MediaCollections_ReturnsPublicCollectionsContainingMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var owner = await factory.AddUserAsync("media-collections-owner", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, "Collected API Movie");
        var otherMediaId = await SeedMediaAsync(factory, "Unrelated API Movie");
        var containingId = await SeedCollectionAsync(factory, owner.Id, "API Containing Collection", mediaId);
        await SeedCollectionAsync(factory, owner.Id, "API Unrelated Collection", otherMediaId);

        var response = await client.GetAsync($"/api/media/{mediaId}/collections");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        Assert.Equal(containingId, item.GetProperty("id").GetGuid());
        Assert.Equal("API Containing Collection", item.GetProperty("name").GetString());
        Assert.Contains(item.GetProperty("items").EnumerateArray(), x => x.GetProperty("mediaId").GetGuid() == mediaId);
    }

    [Fact]
    public async Task MediaCollections_RespectsPrivateVisibility()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var owner = await factory.AddUserAsync("private-media-collections-owner", RoleConstants.User);
        var outsider = await factory.AddUserAsync("private-media-collections-outsider", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, "Private API Movie");
        var collectionId = await SeedCollectionAsync(
            factory,
            owner.Id,
            "Private API Collection",
            mediaId,
            CollectionVisibility.Private);

        var anonymousResponse = await client.GetAsync($"/api/media/{mediaId}/collections");
        var anonymousBody = await anonymousResponse.Content.ReadFromJsonAsync<JsonElement>();

        using var outsiderRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{mediaId}/collections");
        ApiTestFactory.AddTestAuthHeaders(outsiderRequest, outsider, RoleConstants.User);
        var outsiderResponse = await client.SendAsync(outsiderRequest);
        var outsiderBody = await outsiderResponse.Content.ReadFromJsonAsync<JsonElement>();

        using var ownerRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{mediaId}/collections");
        ApiTestFactory.AddTestAuthHeaders(ownerRequest, owner, RoleConstants.User);
        var ownerResponse = await client.SendAsync(ownerRequest);
        var ownerBody = await ownerResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, anonymousResponse.StatusCode);
        Assert.Empty(anonymousBody.EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, outsiderResponse.StatusCode);
        Assert.Empty(outsiderBody.EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, ownerResponse.StatusCode);
        var ownerItem = Assert.Single(ownerBody.EnumerateArray());
        Assert.Equal(collectionId, ownerItem.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task MediaCollections_MissingMediaReturnsNotFound()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/media/{Guid.NewGuid()}/collections");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(404, json.RootElement.GetProperty("status").GetInt32());
    }

    private static async Task<Guid> SeedMediaAsync(ApiTestFactory factory, string title)
    {
        var mediaId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new Media
            {
                Id = mediaId,
                Type = MediaType.Movie,
                Title = title,
                CoverUrl = $"https://example.test/{Uri.EscapeDataString(title)}.jpg",
                ReleaseDate = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        return mediaId;
    }

    private static async Task<Guid> SeedCollectionAsync(
        ApiTestFactory factory,
        Guid ownerId,
        string name,
        Guid mediaId,
        CollectionVisibility visibility = CollectionVisibility.Public)
    {
        var collectionId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Collections.Add(new Collection
            {
                Id = collectionId,
                Name = name,
                Title = name,
                Description = $"{name} description",
                OwnerType = CollectionOwnerType.User,
                OwnerId = ownerId,
                SortMode = CollectionSortMode.Manual,
                Visibility = visibility,
                CreatedAt = DateTime.UtcNow
            });
            db.CollectionItems.Add(new CollectionItem
            {
                Id = Guid.NewGuid(),
                CollectionId = collectionId,
                MediaId = mediaId,
                OrderIndex = 1,
                AddedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        return collectionId;
    }
}
