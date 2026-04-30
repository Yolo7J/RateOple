using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Discovery;

public class DiscoveryContractTests
{
    [Fact]
    public async Task Trending_WorksAnonymouslyAndExcludesDeletedMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var visible = await SeedMediaAsync(factory, "Trending Visible", averageRating: 7, ratingsCount: 2);
        await SeedMediaAsync(factory, "Trending Deleted", averageRating: 10, ratingsCount: 100, isDeleted: true);

        var response = await client.GetAsync("/api/discovery/trending");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        AssertDiscoveryItem(item, visible, "Trending Visible", "Movie");
    }

    [Fact]
    public async Task Popular_WorksAnonymouslyAndRespectsLimit()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var first = await SeedMediaAsync(factory, "Most Popular", averageRating: 6, ratingsCount: 10);
        await SeedMediaAsync(factory, "Second Popular", averageRating: 9, ratingsCount: 5);

        var response = await client.GetAsync("/api/discovery/popular?limit=1");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        Assert.Equal(first, item.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Recommended_AnonymousUserIsUnauthorized()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/discovery/recommended");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Recommended_AuthenticatedUserGetsPersonalizedNonDeletedResults()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("discovery-api-user", RoleConstants.User);
        var genreId = await SeedGenreAsync(factory, "Drama");
        var visible = await SeedMediaAsync(factory, "Recommended Visible", genreIds: [genreId], averageRating: 5, ratingsCount: 1);
        var completed = await SeedMediaAsync(factory, "Recommended Completed", genreIds: [genreId], averageRating: 10, ratingsCount: 100);
        await SeedMediaAsync(factory, "Recommended Deleted", genreIds: [genreId], averageRating: 10, ratingsCount: 100, isDeleted: true);
        await factory.WithDbAsync(db =>
        {
            db.UserGenreScores.Add(new UserGenreScore
            {
                UserId = user.Id,
                GenreId = genreId,
                Score = 25,
                UpdatedAt = DateTime.UtcNow
            });
            db.UserMediaStatuses.Add(new UserMediaStatus
            {
                UserId = user.Id,
                MediaId = completed,
                Status = MediaProgressStatus.Done,
                UpdatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/discovery/recommended");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        Assert.Equal(visible, item.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Similar_WorksAnonymouslyAndExcludesSourceAndDeletedMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var genreId = await SeedGenreAsync(factory, "Mystery");
        var source = await SeedMediaAsync(factory, "Similar Source", genreIds: [genreId], averageRating: 9, ratingsCount: 9);
        var visible = await SeedMediaAsync(factory, "Similar Visible", genreIds: [genreId], averageRating: 5, ratingsCount: 1);
        await SeedMediaAsync(factory, "Similar Deleted", genreIds: [genreId], averageRating: 10, ratingsCount: 100, isDeleted: true);

        var response = await client.GetAsync($"/api/media/{source}/similar");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray());
        Assert.Equal(visible, item.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Similar_MissingMediaReturnsProblemDetails()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/media/{Guid.NewGuid()}/similar");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(404, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task NegativeLimit_ReturnsEmptyDiscoveryList()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        await SeedMediaAsync(factory, "Limit Movie", averageRating: 8, ratingsCount: 1);

        var response = await client.GetAsync("/api/discovery/trending?limit=-1");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(body.EnumerateArray());
    }

    private static async Task<int> SeedGenreAsync(ApiTestFactory factory, string name)
    {
        var genre = new Genre { Name = name };
        await factory.WithDbAsync(db =>
        {
            db.Genres.Add(genre);
            return Task.CompletedTask;
        });

        return genre.Id;
    }

    private static async Task<Guid> SeedMediaAsync(
        ApiTestFactory factory,
        string title,
        MediaType type = MediaType.Movie,
        int[]? genreIds = null,
        double averageRating = 0,
        int ratingsCount = 0,
        bool isDeleted = false)
    {
        var mediaId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new Media
            {
                Id = mediaId,
                Type = type,
                Title = title,
                CoverUrl = $"https://example.test/{Uri.EscapeDataString(title)}.jpg",
                ReleaseDate = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                AverageRating = averageRating,
                RatingsCount = ratingsCount,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = isDeleted
            });

            foreach (var genreId in genreIds ?? [])
            {
                db.MediaGenres.Add(new MediaGenre
                {
                    MediaId = mediaId,
                    GenreId = genreId
                });
            }

            return Task.CompletedTask;
        });

        return mediaId;
    }

    private static void AssertDiscoveryItem(JsonElement item, Guid id, string title, string type)
    {
        Assert.Equal(id, item.GetProperty("id").GetGuid());
        Assert.Equal(title, item.GetProperty("title").GetString());
        Assert.Equal(type, item.GetProperty("type").GetString());
        Assert.Equal(2020, item.GetProperty("releaseYear").GetInt32());
        Assert.Equal($"https://example.test/{Uri.EscapeDataString(title)}.jpg", item.GetProperty("coverUrl").GetString());
        Assert.True(item.TryGetProperty("averageRating", out _));
        Assert.True(item.TryGetProperty("ratingsCount", out _));
    }
}
