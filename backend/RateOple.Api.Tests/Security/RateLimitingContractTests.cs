using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Auth.Services;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Security;

public class RateLimitingContractTests
{
    [Fact]
    public async Task RegisterRateLimit_ReturnsProblemDetailsWithRetryAfter()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 4; i++)
        {
            using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
            {
                username = $"register-limit-{i}",
                email = "register-limit@example.test",
                password = "Password1",
                captchaToken = FakeCaptchaVerifier.ValidToken
            });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task LoginIpLimit_Returns429()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 21; i++)
        {
            using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
            {
                email = $"missing-{i}@example.test",
                password = "WrongPassword1",
                captchaToken = FakeCaptchaVerifier.ValidToken
            });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task RefreshLimit_Returns429()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 61; i++)
        {
            using var request = Request(csrf, HttpMethod.Post, "/api/auth/refresh", new { });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task EmailSendLimit_Returns429()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 4; i++)
        {
            using var request = Request(csrf, HttpMethod.Post, "/api/auth/forgot-password", new
            {
                email = "email-limit@example.test"
            });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task UgcBurstLimit_Returns429()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("ugc-limit", RoleConstants.User);
        var media = new Media { Id = Guid.NewGuid(), Type = MediaType.Movie, Title = "UGC Limit Movie", CreatedAt = DateTime.UtcNow };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 31; i++)
        {
            using var request = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, $"/api/media/{media.Id}/status", new
            {
                status = "Done"
            });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task LookupSearchLimit_Returns429()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateClient();

        HttpResponseMessage response = null!;
        for (var i = 0; i < 121; i++)
            response = await client.GetAsync("/api/media/lookup?search=limit");

        await AssertRateLimitedAsync(response);
    }

    [Fact]
    public async Task AdminMutationLimit_AppliesToStaffUsers()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("admin-limit", RoleConstants.Admin);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        HttpResponseMessage response = null!;
        for (var i = 0; i < 121; i++)
        {
            using var request = AuthenticatedRequest(admin, [RoleConstants.Admin], csrf, HttpMethod.Post, $"/api/admin/users/{Guid.NewGuid()}/roles/moderator", new { });
            response = await client.SendAsync(request);
        }

        await AssertRateLimitedAsync(response);
    }

    private static async Task AssertRateLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter?.Delta.HasValue == true || response.Headers.RetryAfter?.Date.HasValue == true);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(429, body.GetProperty("status").GetInt32());
        Assert.Equal("rate_limit_exceeded", body.GetProperty("code").GetString());
        Assert.True(body.TryGetProperty("traceId", out _));
        Assert.True(body.TryGetProperty("message", out _));
    }

    private static HttpRequestMessage Request(CsrfState csrf, HttpMethod method, string url, object body)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(body);
        return request;
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        CsrfState csrf,
        HttpMethod method,
        string url,
        object body)
    {
        var request = Request(csrf, method, url, body);
        ApiTestFactory.AddTestAuthHeaders(request, user, roles);
        return request;
    }
}
