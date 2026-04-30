using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Social;

public class ReviewContractTests
{
    [Fact]
    public async Task AnonymousUser_CannotCreateReview()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/reviews");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(new { ratingId = Guid.NewGuid(), content = "Anonymous review" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedUser_WithCsrf_CanCreateReviewForOwnRating()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("review-api-user", RoleConstants.User);
        var (mediaId, ratingId) = await SeedMediaRatingAsync(factory, user.Id);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/reviews",
            new { ratingId, content = "API review" });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(mediaId, body.GetProperty("mediaId").GetGuid());
        Assert.Equal("API review", body.GetProperty("content").GetString());
        await factory.WithDbAsync(async db => Assert.Single(await db.Reviews.ToListAsync()));
    }

    [Fact]
    public async Task MissingCsrf_FailsBeforeReviewMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("review-csrf-user", RoleConstants.User);
        var (_, ratingId) = await SeedMediaRatingAsync(factory, user.Id);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/reviews");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        request.Content = JsonContent.Create(new { ratingId, content = "No CSRF" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.Reviews.AnyAsync()));
    }

    [Fact]
    public async Task NonOwner_CannotUpdateOrDeleteAnotherUsersReview()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var owner = await factory.AddUserAsync("review-owner-api", RoleConstants.User);
        var other = await factory.AddUserAsync("review-other-api", RoleConstants.User);
        var (_, _, reviewId) = await SeedReviewAsync(factory, owner.Id);
        var csrf = await factory.GetCsrfAsync(client, other, RoleConstants.User);

        using var update = AuthenticatedRequest(
            other,
            [RoleConstants.User],
            csrf,
            HttpMethod.Put,
            $"/api/reviews/{reviewId}",
            new { content = "Attempted update" });
        var updateResponse = await client.SendAsync(update);

        using var delete = AuthenticatedRequest(
            other,
            [RoleConstants.User],
            csrf,
            HttpMethod.Delete,
            $"/api/reviews/{reviewId}",
            body: null);
        var deleteResponse = await client.SendAsync(delete);

        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task InvalidPayload_ReturnsValidationProblemDetails()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("review-invalid-api", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/reviews",
            new { ratingId = Guid.Empty, content = "Invalid rating id" });

        var response = await client.SendAsync(request);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("errors", out _));
    }

    [Fact]
    public async Task DeletedMediaTarget_CannotBeReviewed()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("review-deleted-api", RoleConstants.User);
        var (_, ratingId) = await SeedMediaRatingAsync(factory, user.Id, isDeleted: true);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/reviews",
            new { ratingId, content = "Deleted media review" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.Reviews.AnyAsync()));
    }

    [Fact]
    public async Task PublicMediaReviews_CanBeReadWithoutAuth()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-public-api", RoleConstants.User);
        var (mediaId, _, _) = await SeedReviewAsync(factory, user.Id, content: "Public review");

        var response = await client.GetAsync($"/api/media/{mediaId}/reviews");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = body.EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal("Public review", items[0].GetProperty("content").GetString());
    }

    private static async Task<(Guid MediaId, Guid RatingId)> SeedMediaRatingAsync(
        ApiTestFactory factory,
        Guid userId,
        bool isDeleted = false)
    {
        var mediaId = Guid.NewGuid();
        var ratingId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new Media
            {
                Id = mediaId,
                Type = MediaType.Movie,
                Title = "Review API Movie",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = isDeleted
            });
            db.Ratings.Add(new Rating
            {
                Id = ratingId,
                UserId = userId,
                MediaId = mediaId,
                Value = 8,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        return (mediaId, ratingId);
    }

    private static async Task<(Guid MediaId, Guid RatingId, Guid ReviewId)> SeedReviewAsync(
        ApiTestFactory factory,
        Guid userId,
        string content = "Existing API review")
    {
        var (mediaId, ratingId) = await SeedMediaRatingAsync(factory, userId);
        var reviewId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Reviews.Add(new Review
            {
                Id = reviewId,
                UserId = userId,
                MediaId = mediaId,
                RatingId = ratingId,
                Content = content,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        return (mediaId, ratingId, reviewId);
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        CsrfState csrf,
        HttpMethod method,
        string url,
        object? body)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        ApiTestFactory.AddTestAuthHeaders(request, user, roles);
        if (body != null)
            request.Content = JsonContent.Create(body);
        return request;
    }
}
