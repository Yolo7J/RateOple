using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Social;

public class InteractionContractTests
{
    [Fact]
    public async Task AnonymousMediaRead_DoesNotRecordInteraction()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var mediaId = await SeedMediaAsync(factory, "Anonymous Open Movie");

        var response = await client.GetAsync($"/api/media/{mediaId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.MediaInteractions.AnyAsync()));
    }

    [Fact]
    public async Task AuthenticatedMediaRead_RecordsMediaOpenedInteractionWithoutCsrf()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("interaction-api-user", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, "Authenticated Open Movie");

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{mediaId}");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var interaction = Assert.Single(await db.MediaInteractions.ToListAsync());
            Assert.Equal(user.Id, interaction.UserId);
            Assert.Equal(mediaId, interaction.MediaId);
            Assert.Equal(InteractionType.MediaOpened, interaction.InteractionType);
            Assert.Equal(1, interaction.Points);
        });
    }

    [Fact]
    public async Task DeletedMediaRead_ReturnsNotFoundAndDoesNotRecordInteraction()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("interaction-deleted-api-user", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, "Deleted Open Movie", isDeleted: true);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{mediaId}");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.MediaInteractions.AnyAsync()));
    }

    [Fact]
    public async Task MissingMediaRead_ReturnsNotFoundAndDoesNotRecordInteraction()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("interaction-missing-api-user", RoleConstants.User);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{Guid.NewGuid()}");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.MediaInteractions.AnyAsync()));
    }

    [Fact]
    public async Task TrendingReflectsAuthenticatedOpenForNonDeletedMediaOnly()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("interaction-trending-api-user", RoleConstants.User);
        var visibleId = await SeedMediaAsync(factory, "Opened Visible Movie");
        var deletedId = await SeedMediaAsync(factory, "Opened Deleted Movie", isDeleted: true);

        using var visibleRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{visibleId}");
        ApiTestFactory.AddTestAuthHeaders(visibleRequest, user, RoleConstants.User);
        var visibleResponse = await client.SendAsync(visibleRequest);

        using var deletedRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/media/{deletedId}");
        ApiTestFactory.AddTestAuthHeaders(deletedRequest, user, RoleConstants.User);
        var deletedResponse = await client.SendAsync(deletedRequest);

        var trendingResponse = await client.GetAsync("/api/discovery/trending");
        var body = await trendingResponse.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, visibleResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deletedResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, trendingResponse.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        Assert.Equal(visibleId, item.GetProperty("id").GetGuid());
        await factory.WithDbAsync(async db => Assert.Single(await db.MediaInteractions.ToListAsync()));
    }

    private static async Task<Guid> SeedMediaAsync(
        ApiTestFactory factory,
        string title,
        bool isDeleted = false)
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
                CreatedAt = DateTime.UtcNow,
                IsDeleted = isDeleted
            });
            return Task.CompletedTask;
        });

        return mediaId;
    }
}
