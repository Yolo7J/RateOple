using System.Net;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;
using RateOple.Infrastructure.Security;

namespace RateOple.Api.Tests.Auth;

public class AuthRefreshTests
{
    [Fact]
    public async Task Refresh_RotatesRefreshTokenAndRevokesOldToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("refresh-user", "User");
        var refreshToken = "refresh-token";
        await factory.WithDbAsync(db =>
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client);

        var response = await SendRefreshAsync(client, refreshToken, csrf);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var tokens = await db.RefreshTokens.OrderBy(t => t.CreatedAt).ToListAsync();
            Assert.Equal(2, tokens.Count);
            Assert.True(tokens.Single(t => t.TokenHash == TokenHasher.Hash(refreshToken)).Revoked);
            Assert.Single(tokens, t => !t.Revoked && t.ExpiresAt > DateTime.UtcNow);
            Assert.DoesNotContain(tokens, t => t.TokenHash == refreshToken);
        });
    }

    [Fact]
    public async Task Refresh_ReusingRevokedTokenFails()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("revoked-refresh-user", "User");
        var refreshToken = "revoked-refresh-token";
        await factory.WithDbAsync(db =>
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                Revoked = true
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client);

        var response = await SendRefreshAsync(client, refreshToken, csrf);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_ExpiredOrInvalidTokenFails()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("expired-refresh-user", "User");
        var refreshToken = "expired-refresh-token";
        await factory.WithDbAsync(db =>
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddMinutes(-1)
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client);

        var expired = await SendRefreshAsync(client, refreshToken, csrf);
        var invalid = await SendRefreshAsync(client, "not-stored", csrf);

        Assert.Equal(HttpStatusCode.Unauthorized, expired.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);
    }

    [Fact]
    public async Task Refresh_DeletedUserFails()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("deleted-refresh-user", "User");
        var refreshToken = "deleted-refresh-token";
        await factory.WithDbAsync(db =>
        {
            db.Users.Attach(user);
            user.IsDeleted = true;
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client);

        var response = await SendRefreshAsync(client, refreshToken, csrf);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesActiveRefreshToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("logout-user", "User");
        var refreshToken = "logout-refresh-token";
        await factory.WithDbAsync(db =>
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = TokenHasher.Hash(refreshToken),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", $"{csrf.Cookie}; refreshToken={refreshToken}");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var stored = await db.RefreshTokens.SingleAsync();
            Assert.True(stored.Revoked);
        });
    }

    private static async Task<HttpResponseMessage> SendRefreshAsync(HttpClient client, string refreshToken, CsrfState csrf)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", $"{csrf.Cookie}; refreshToken={refreshToken}");
        return await client.SendAsync(request);
    }
}
