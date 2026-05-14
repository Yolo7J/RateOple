using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Auth.Services;
using RateOple.Core.Contracts;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Auth;

public class AccountLifecycleContractTests
{
    [Fact]
    public async Task Register_CreatesUnconfirmedUser_AndSendsConfirmationEmail()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username = "pending-user",
            email = "pending-user@example.test",
            password = "Password1",
            captchaToken = FakeCaptchaVerifier.ValidToken
        });
        var response = await client.SendAsync(request);

        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.SingleAsync(u => u.Email == "pending-user@example.test");
            Assert.False(user.EmailConfirmed);
        });
        var email = Assert.Single(factory.GetFakeEmailSender().Sent);
        Assert.Equal("pending-user@example.test", email.To);
        Assert.Contains("/confirm-email", email.HtmlBody);
    }

    [Fact]
    public async Task ConfirmEmail_WithValidToken_MarksUserConfirmed()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        await RegisterAsync(client, csrf, "confirm-user", "confirm-user@example.test");
        var (email, token) = ExtractEmailLinkPayload(factory.GetFakeEmailSender().Sent.Last().HtmlBody);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/confirm-email", new { email, token });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.SingleAsync(u => u.Email == email);
            Assert.True(user.EmailConfirmed);
        });
    }

    [Fact]
    public async Task ConfirmEmail_WithInvalidToken_FailsSafely()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        await RegisterAsync(client, csrf, "invalid-confirm", "invalid-confirm@example.test");

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/confirm-email", new
        {
            email = "invalid-confirm@example.test",
            token = "not-a-valid-token"
        });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.SingleAsync(u => u.Email == "invalid-confirm@example.test");
            Assert.False(user.EmailConfirmed);
        });
    }

    [Fact]
    public async Task ResendConfirmation_IsEnumerationSafe_AndSendsForUnconfirmedUser()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        await RegisterAsync(client, csrf, "resend-user", "resend-user@example.test");
        factory.GetFakeEmailSender().Sent.Clear();

        using var existing = Request(csrf, HttpMethod.Post, "/api/auth/resend-confirmation", new { email = "resend-user@example.test" });
        using var missing = Request(csrf, HttpMethod.Post, "/api/auth/resend-confirmation", new { email = "missing@example.test" });

        var existingResponse = await client.SendAsync(existing);
        var missingResponse = await client.SendAsync(missing);

        Assert.Equal(HttpStatusCode.OK, existingResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, missingResponse.StatusCode);
        Assert.Equal("resend-user@example.test", Assert.Single(factory.GetFakeEmailSender().Sent).To);
    }

    [Fact]
    public async Task UnconfirmedUser_CanLogin_ReadOnly()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        await RegisterAsync(client, csrf, "login-pending", "login-pending@example.test");

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = "login-pending@example.test",
            password = "Password1"
        });
        var response = await client.SendAsync(request);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(body.GetProperty("emailConfirmed").GetBoolean());
        Assert.True(body.GetProperty("isReadOnly").GetBoolean());
        Assert.Equal("unconfirmed", body.GetProperty("accountState").GetString());
    }

    [Fact]
    public async Task DeletedUser_CannotLogin()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("deleted-login", RoleConstants.User);
        await factory.WithDbAsync(async db =>
        {
            var stored = await db.Users.SingleAsync(u => u.Id == user.Id);
            stored.IsDeleted = true;
            stored.DeletedAt = DateTime.UtcNow;
        });

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = "deleted-login@example.test",
            password = "Password1"
        });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsGenericSuccess_ForExistingAndMissingEmail()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        await factory.AddUserAsync("forgot-user", RoleConstants.User);

        using var existing = Request(csrf, HttpMethod.Post, "/api/auth/forgot-password", new { email = "forgot-user@example.test" });
        using var missing = Request(csrf, HttpMethod.Post, "/api/auth/forgot-password", new { email = "missing@example.test" });

        var existingResponse = await client.SendAsync(existing);
        var missingResponse = await client.SendAsync(missing);
        var existingText = await existingResponse.Content.ReadAsStringAsync();
        var missingText = await missingResponse.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, existingResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, missingResponse.StatusCode);
        Assert.Equal(existingText, missingText);
    }

    [Fact]
    public async Task ResetPassword_WithValidToken_ChangesPassword_AndRevokesRefreshTokens()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("reset-user", RoleConstants.User);
        await factory.WithDbAsync(db =>
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash = "existing-refresh-token",
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            });
            return Task.CompletedTask;
        });

        using var forgot = Request(csrf, HttpMethod.Post, "/api/auth/forgot-password", new { email = user.Email });
        var forgotResponse = await client.SendAsync(forgot);
        Assert.Equal(HttpStatusCode.OK, forgotResponse.StatusCode);
        var (email, token) = ExtractEmailLinkPayload(factory.GetFakeEmailSender().Sent.Last().HtmlBody);

        using var reset = Request(csrf, HttpMethod.Post, "/api/auth/reset-password", new
        {
            email,
            token,
            newPassword = "NewPassword1"
        });
        var resetResponse = await client.SendAsync(reset);

        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);
        await factory.WithDbAsync(async db => Assert.All(
            await db.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync(),
            tokenRow => Assert.True(tokenRow.Revoked)));

        using var login = Request(csrf, HttpMethod.Post, "/api/auth/login", new { email, password = "NewPassword1" });
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(login)).StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WithInvalidToken_FailsSafely()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("bad-reset", RoleConstants.User);

        using var reset = Request(csrf, HttpMethod.Post, "/api/auth/reset-password", new
        {
            email = user.Email,
            token = "bad-token",
            newPassword = "NewPassword1"
        });
        var response = await client.SendAsync(reset);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UnconfirmedUser_CannotCreateUserGeneratedContent()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("unconfirmed-ugc", emailConfirmed: false, roles: RoleConstants.User);
        var media = new Media { Id = Guid.NewGuid(), Type = MediaType.Movie, Title = "Blocked Movie", CreatedAt = DateTime.UtcNow };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        var checks = new[]
        {
            (HttpMethod.Post, $"/api/media/{media.Id}/ratings", (object)new { value = 8 }),
            (HttpMethod.Post, $"/api/media/{media.Id}/status", new { status = "Done" }),
            (HttpMethod.Post, "/api/groups", new { name = "Nope", visibility = GroupVisibility.Public }),
            (HttpMethod.Post, "/api/collections", new { name = "Nope", visibility = CollectionVisibility.Public }),
            (HttpMethod.Post, "/api/moderation/reports", new { targetType = ReportTargetType.User, targetId = user.Id, reason = "nope" }),
            (HttpMethod.Post, "/api/follows", new { followingId = Guid.NewGuid() })
        };

        foreach (var (method, path, body) in checks)
        {
            using var request = AuthenticatedRequest(user, [RoleConstants.User], csrf, method, path, body);
            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task ConfirmedUser_CanCreateAllowedContent()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("confirmed-ugc", RoleConstants.User);
        var media = new Media { Id = Guid.NewGuid(), Type = MediaType.Movie, Title = "Allowed Movie", CreatedAt = DateTime.UtcNow };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, $"/api/media/{media.Id}/ratings", new { value = 8 });
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Cleanup_DeletesOldSafeUnconfirmedUser_ButNotConfirmedOrPrivileged()
    {
        using var factory = new ApiTestFactory();
        var oldPending = await factory.AddUserAsync("old-pending", emailConfirmed: false, roles: RoleConstants.User);
        var confirmed = await factory.AddUserAsync("confirmed-keep", RoleConstants.User);
        var moderator = await factory.AddUserAsync("pending-staff", emailConfirmed: false, roles: RoleConstants.Moderator);

        await factory.WithDbAsync(async db =>
        {
            await db.Users
                .Where(u => u.Id == oldPending.Id || u.Id == confirmed.Id || u.Id == moderator.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.CreatedAt, DateTime.UtcNow.AddHours(-25)));
        });

        using var scope = factory.Services.CreateScope();
        var cleanup = scope.ServiceProvider.GetRequiredService<IUnconfirmedAccountCleanupService>();
        var deleted = await cleanup.CleanupAsync();

        Assert.Equal(1, deleted);
        await factory.WithDbAsync(async db =>
        {
            Assert.False(await db.Users.AnyAsync(u => u.Id == oldPending.Id));
            Assert.True(await db.Users.AnyAsync(u => u.Id == confirmed.Id));
            Assert.True(await db.Users.AnyAsync(u => u.Id == moderator.Id));
        });
    }

    [Fact]
    public async Task SuspendedUser_CannotCreateContentOrNormalReports_ButCanCreateOnePendingAppeal()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("suspended-user", isSuspended: true, roles: RoleConstants.User);
        var media = new Media { Id = Guid.NewGuid(), Type = MediaType.Movie, Title = "Suspended Movie", CreatedAt = DateTime.UtcNow };
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(media);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var rating = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, $"/api/media/{media.Id}/ratings", new { value = 7 });
        using var report = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, "/api/moderation/reports", new { targetType = ReportTargetType.User, targetId = user.Id, reason = "normal report" });
        using var appeal = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, "/api/suspension-appeals", new { text = "Please review my suspension because I believe this was a mistake." });
        using var duplicate = AuthenticatedRequest(user, [RoleConstants.User], csrf, HttpMethod.Post, "/api/suspension-appeals", new { text = "Please review my suspension again because I believe this was a mistake." });

        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(rating)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(report)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(appeal)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(duplicate)).StatusCode);
    }

    private static async Task RegisterAsync(HttpClient client, CsrfState csrf, string username, string email)
    {
        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username,
            email,
            password = "Password1",
            captchaToken = FakeCaptchaVerifier.ValidToken
        });

        var response = await client.SendAsync(request);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private static (string Email, string Token) ExtractEmailLinkPayload(string html)
    {
        var href = Regex.Match(html, "href=\"(?<url>[^\"]+)\"").Groups["url"].Value;
        var uri = new Uri(System.Net.WebUtility.HtmlDecode(href));
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        return (query["email"].ToString(), query["token"].ToString());
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
