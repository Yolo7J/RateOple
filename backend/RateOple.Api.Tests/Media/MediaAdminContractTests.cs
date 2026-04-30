using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.MediaTests;

public class MediaAdminContractTests
{
    [Fact]
    public async Task AnonymousUser_CannotCreateMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/media/movies");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(new { title = "Anonymous Movie" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task NormalUser_CannotCreateMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("media-user", RoleConstants.User);
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
    public async Task Admin_WithCsrf_CanCreateUpdateAndDeleteMovie()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("media-admin", RoleConstants.Admin);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var create = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Post,
            "/api/media/movies",
            new
            {
                title = "Admin Movie",
                releaseYear = 2001,
                director = "Director",
                duration = 99
            });
        var createResponse = await client.SendAsync(create);
        var createdBody = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var mediaId = createdBody.GetProperty("id").GetGuid();

        using var update = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Put,
            $"/api/media/{mediaId}/movie",
            new
            {
                title = "Updated Admin Movie",
                director = "Updated Director",
                duration = 100
            });
        var updateResponse = await client.SendAsync(update);

        using var delete = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Delete,
            $"/api/media/{mediaId}",
            body: null);
        var deleteResponse = await client.SendAsync(delete);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var media = await db.Media.SingleAsync(m => m.Id == mediaId);
            Assert.Equal("Updated Admin Movie", media.Title);
            Assert.True(media.IsDeleted);
        });
    }

    [Fact]
    public async Task MissingCsrf_FailsBeforeAdminMutation()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("csrf-media-admin", RoleConstants.Admin);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/media/movies");
        ApiTestFactory.AddTestAuthHeaders(request, admin, RoleConstants.Admin);
        request.Content = JsonContent.Create(new { title = "No CSRF" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await factory.WithDbAsync(async db => Assert.False(await db.Media.AnyAsync()));
    }

    [Fact]
    public async Task InvalidPayload_ReturnsValidationProblemDetails()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("invalid-media-admin", RoleConstants.Admin);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var request = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Post,
            "/api/media/movies",
            new { releaseYear = 1200 });

        var response = await client.SendAsync(request);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("errors", out _));
    }

    [Fact]
    public async Task WrongSubtypeUpdate_ReturnsProblemDetails()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("wrong-subtype-admin", RoleConstants.Admin);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);
        var bookId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new RateOple.Infrastructure.Data.Entities.Media
            {
                Id = bookId,
                Type = MediaType.Book,
                Title = "Book",
                CreatedAt = DateTime.UtcNow
            });
            db.Books.Add(new Book { MediaId = bookId, Author = "Author" });
            return Task.CompletedTask;
        });

        using var request = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Put,
            $"/api/media/{bookId}/movie",
            new { title = "Wrong" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task PublicGetMediaQuery_DoesNotRequireAuthAndExcludesDeletedMedia()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new RateOple.Infrastructure.Data.Entities.Media
            {
                Id = Guid.NewGuid(),
                Type = MediaType.Movie,
                Title = "Visible Movie",
                CreatedAt = DateTime.UtcNow
            });
            db.Media.Add(new RateOple.Infrastructure.Data.Entities.Media
            {
                Id = Guid.NewGuid(),
                Type = MediaType.Movie,
                Title = "Deleted Movie",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = true
            });
            return Task.CompletedTask;
        });

        var response = await client.GetAsync("/api/media");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var items = json.RootElement.GetProperty("items").EnumerateArray().ToList();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(items);
        Assert.Equal("Visible Movie", items[0].GetProperty("title").GetString());
        Assert.Equal(1, json.RootElement.GetProperty("totalCount").GetInt32());
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
