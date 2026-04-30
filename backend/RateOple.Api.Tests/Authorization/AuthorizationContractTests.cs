using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Authorization;

public class AuthorizationContractTests
{
    [Fact]
    public async Task AnonymousUser_CannotAccessAuthenticatedMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/media/{Guid.NewGuid()}/ratings");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(new { value = 8 });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task NonAdmin_CannotAccessAdminMediaMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("plain-user", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/media/movies",
            new { title = "Forbidden Movie" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task NonModerator_CannotUpdateModerationStatus()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("plain-user", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Put,
            $"/api/moderation/reports/{Guid.NewGuid()}/status",
            new { status = ReportStatus.Resolved });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuthenticatedUser_WithCsrf_CanMutateOwnRating()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("rating-user", RoleConstants.User);
        var media = new Media
        {
            Id = Guid.NewGuid(),
            Type = MediaType.Movie,
            Title = "Rateable Movie",
            CreatedAt = DateTime.UtcNow
        };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            $"/api/media/{media.Id}/ratings",
            new { value = 7 });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var rating = await db.Ratings.SingleAsync();
            Assert.Equal(user.Id, rating.UserId);
            Assert.Equal(media.Id, rating.MediaId);
            Assert.Equal(7, rating.Value);
        });
    }

    [Fact]
    public async Task MissingCsrf_FailsBeforeMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("csrf-user", RoleConstants.User);
        var media = new Media
        {
            Id = Guid.NewGuid(),
            Type = MediaType.Movie,
            Title = "CSRF Movie",
            CreatedAt = DateTime.UtcNow
        };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, $"/api/media/{media.Id}/ratings");
        ApiTestFactory.AddTestAuthHeaders(request, user, RoleConstants.User);
        request.Content = JsonContent.Create(new { value = 9 });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.Ratings.AnyAsync()));
    }

    [Fact]
    public async Task ServiceException_ReturnsProblemDetailsShape()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("report-user", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/moderation/reports",
            new
            {
                targetType = ReportTargetType.User,
                targetId = Guid.NewGuid(),
                reason = "missing target"
            });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(404, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
        Assert.True(json.RootElement.TryGetProperty("message", out _));
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
