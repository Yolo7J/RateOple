using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Users;

public class UserMediaStatusContractTests
{
    [Fact]
    public async Task AnonymousUser_CannotSetMediaStatus()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var mediaId = await SeedMediaAsync(factory);
        var csrf = await factory.GetCsrfAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/media/{mediaId}/status");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(new { status = "Plan" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedUser_WithCsrf_CanSetMediaStatus()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("status-api-user", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, title: "API Status Movie");
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            $"/api/media/{mediaId}/status",
            new { status = "On it" });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(mediaId, body.GetProperty("mediaId").GetGuid());
        Assert.Equal("API Status Movie", body.GetProperty("title").GetString());
        Assert.Equal("On it", body.GetProperty("status").GetString());
        await factory.WithDbAsync(async db => Assert.Single(await db.UserMediaStatuses.ToListAsync()));
    }

    [Fact]
    public async Task MissingCsrf_FailsBeforeStatusMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("status-csrf-api", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/media/{mediaId}/status");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        request.Content = JsonContent.Create(new { status = "Plan" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.UserMediaStatuses.AnyAsync()));
    }

    [Fact]
    public async Task DeletedMedia_CannotReceiveStatus()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("status-deleted-api", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, isDeleted: true);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            $"/api/media/{mediaId}/status",
            new { status = "Plan" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.UserMediaStatuses.AnyAsync()));
    }

    [Fact]
    public async Task AuthenticatedUser_CanReadOwnStatuses()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("status-reader-api", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory, title: "Readable Status Movie");
        await factory.WithDbAsync(db =>
        {
            db.UserMediaStatuses.Add(new UserMediaStatus
            {
                UserId = user.Id,
                MediaId = mediaId,
                Status = MediaProgressStatus.Done,
                UpdatedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/users/me/status");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = body.EnumerateArray().ToList();
        Assert.Single(items);
        Assert.Equal(mediaId, items[0].GetProperty("mediaId").GetGuid());
        Assert.Equal("Readable Status Movie", items[0].GetProperty("title").GetString());
    }

    [Fact]
    public async Task InvalidPayload_ReturnsValidationProblemDetails()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("status-invalid-api", RoleConstants.User);
        var mediaId = await SeedMediaAsync(factory);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            $"/api/media/{mediaId}/status",
            new { status = new string('x', 40) });

        var response = await client.SendAsync(request);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("errors", out _));
    }

    private static async Task<Guid> SeedMediaAsync(
        ApiTestFactory factory,
        string title = "Status API Movie",
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
                CreatedAt = DateTime.UtcNow,
                IsDeleted = isDeleted
            });
            return Task.CompletedTask;
        });

        return mediaId;
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        CsrfState csrf,
        HttpMethod method,
        string url,
        object body)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        ApiTestFactory.AddTestAuthHeaders(request, user, roles);
        request.Content = JsonContent.Create(body);
        return request;
    }
}
