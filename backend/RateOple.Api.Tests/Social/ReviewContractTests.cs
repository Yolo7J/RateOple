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
    public async Task AuthenticatedUser_CreateReviewRecordsInteractionAndUpdatesTaste()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var user = await factory.AddUserAsync("review-signal-api-user", RoleConstants.User);
        var (mediaId, ratingId) = await SeedMediaRatingAsync(factory, user.Id, withGenre: true);
        var csrf = await factory.GetCsrfAsync(client, user, RoleConstants.User);

        using var request = AuthenticatedRequest(
            user,
            [RoleConstants.User],
            csrf,
            HttpMethod.Post,
            "/api/reviews",
            new { ratingId, content = "API signal review" });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var interaction = await db.MediaInteractions.SingleAsync();
            Assert.Equal(user.Id, interaction.UserId);
            Assert.Equal(mediaId, interaction.MediaId);
            Assert.Equal(InteractionType.ReviewCreated, interaction.InteractionType);
            Assert.Equal(8, interaction.Points);

            var score = await db.UserGenreScores.SingleAsync();
            Assert.Equal(user.Id, score.UserId);
            Assert.Equal(22, score.Score);
        });
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
        await factory.WithDbAsync(async db =>
        {
            Assert.False(await db.Reviews.AnyAsync());
            Assert.False(await db.MediaInteractions.AnyAsync());
            Assert.False(await db.UserGenreScores.AnyAsync());
        });
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
        await factory.WithDbAsync(async db =>
        {
            Assert.False(await db.MediaInteractions.AnyAsync());
            Assert.False(await db.UserGenreScores.AnyAsync());
            Assert.Single(await db.Reviews.ToListAsync());
        });
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
        await factory.WithDbAsync(async db =>
        {
            Assert.False(await db.Reviews.AnyAsync());
            Assert.False(await db.MediaInteractions.AnyAsync());
            Assert.False(await db.UserGenreScores.AnyAsync());
        });
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
        Assert.Equal("Media", items[0].GetProperty("targetType").GetString());
        Assert.Equal(8, items[0].GetProperty("ratingValue").GetInt32());
        Assert.Equal("Review API Movie", items[0].GetProperty("targetTitle").GetString());
    }

    [Fact]
    public async Task PublicMediaReviews_WithMediaTargetExcludesSeasonAndEpisodeReviews()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-media-target-api", RoleConstants.User);
        var ids = await SeedTargetAwareReviewSetAsync(factory, user.Id);

        var response = await client.GetAsync($"/api/media/{ids.MediaId}/reviews?target=media");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray().ToList());
        Assert.Equal(ids.MediaReviewId, item.GetProperty("id").GetGuid());
        Assert.Equal("Media", item.GetProperty("targetType").GetString());
        Assert.Equal(6, item.GetProperty("ratingValue").GetInt32());
    }

    [Fact]
    public async Task PublicMediaReviews_WithAllTargetIncludesMediaSeasonAndEpisodeLabels()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-all-target-api", RoleConstants.User);
        var ids = await SeedTargetAwareReviewSetAsync(factory, user.Id);

        var response = await client.GetAsync($"/api/media/{ids.MediaId}/reviews?target=all");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = body.EnumerateArray().ToList();
        Assert.Equal(3, items.Count);
        Assert.Contains(items, item =>
            item.GetProperty("targetType").GetString() == "Media" &&
            item.GetProperty("targetTitle").GetString() == "Review API Series");
        Assert.Contains(items, item =>
            item.GetProperty("targetType").GetString() == "Season" &&
            item.GetProperty("seasonId").GetGuid() == ids.SeasonId &&
            item.GetProperty("seasonNumber").GetInt32() == 2 &&
            item.GetProperty("targetTitle").GetString() == "Season 2");
        Assert.Contains(items, item =>
            item.GetProperty("targetType").GetString() == "Episode" &&
            item.GetProperty("episodeId").GetGuid() == ids.EpisodeId &&
            item.GetProperty("seasonNumber").GetInt32() == 2 &&
            item.GetProperty("episodeNumber").GetInt32() == 4 &&
            item.GetProperty("targetTitle").GetString() == "The API Episode");
    }

    [Fact]
    public async Task PublicMediaReviews_WithInvalidTargetReturnsValidationProblem()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-invalid-target-api", RoleConstants.User);
        var ids = await SeedTargetAwareReviewSetAsync(factory, user.Id);

        var response = await client.GetAsync($"/api/media/{ids.MediaId}/reviews?target=episodes");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.True(json.RootElement.TryGetProperty("errors", out _));
    }

    [Fact]
    public async Task PublicSeasonReviews_ReturnOnlySeasonTargetReviews()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-season-target-api", RoleConstants.User);
        var ids = await SeedTargetAwareReviewSetAsync(factory, user.Id);

        var response = await client.GetAsync($"/api/seasons/{ids.SeasonId}/reviews");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray().ToList());
        Assert.Equal(ids.SeasonReviewId, item.GetProperty("id").GetGuid());
        Assert.Equal("Season", item.GetProperty("targetType").GetString());
        Assert.Equal(ids.SeasonId, item.GetProperty("seasonId").GetGuid());
        Assert.Equal(2, item.GetProperty("seasonNumber").GetInt32());
        Assert.Equal(7, item.GetProperty("ratingValue").GetInt32());
        Assert.Equal("Season 2", item.GetProperty("targetTitle").GetString());
    }

    [Fact]
    public async Task PublicEpisodeReviews_ReturnOnlyEpisodeTargetReviews()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var user = await factory.AddUserAsync("review-episode-target-api", RoleConstants.User);
        var ids = await SeedTargetAwareReviewSetAsync(factory, user.Id);

        var response = await client.GetAsync($"/api/episodes/{ids.EpisodeId}/reviews");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var item = Assert.Single(body.EnumerateArray().ToList());
        Assert.Equal(ids.EpisodeReviewId, item.GetProperty("id").GetGuid());
        Assert.Equal("Episode", item.GetProperty("targetType").GetString());
        Assert.Equal(ids.EpisodeId, item.GetProperty("episodeId").GetGuid());
        Assert.Equal(2, item.GetProperty("seasonNumber").GetInt32());
        Assert.Equal(4, item.GetProperty("episodeNumber").GetInt32());
        Assert.Equal(9, item.GetProperty("ratingValue").GetInt32());
        Assert.Equal("The API Episode", item.GetProperty("targetTitle").GetString());
    }

    private static async Task<(Guid MediaId, Guid RatingId)> SeedMediaRatingAsync(
        ApiTestFactory factory,
        Guid userId,
        bool isDeleted = false,
        bool withGenre = false)
    {
        var mediaId = Guid.NewGuid();
        var ratingId = Guid.NewGuid();
        await factory.WithDbAsync(db =>
        {
            var media = new Media
            {
                Id = mediaId,
                Type = MediaType.Movie,
                Title = "Review API Movie",
                CreatedAt = DateTime.UtcNow,
                IsDeleted = isDeleted
            };
            db.Media.Add(media);
            if (withGenre)
            {
                var genre = new Genre { Name = $"Review API Genre {Guid.NewGuid():N}" };
                db.Genres.Add(genre);
                db.MediaGenres.Add(new MediaGenre { MediaId = mediaId, Genre = genre });
            }
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

    private static async Task<TargetAwareReviewIds> SeedTargetAwareReviewSetAsync(
        ApiTestFactory factory,
        Guid userId)
    {
        var mediaId = Guid.NewGuid();
        var seasonId = Guid.NewGuid();
        var episodeId = Guid.NewGuid();
        var mediaRatingId = Guid.NewGuid();
        var seasonRatingId = Guid.NewGuid();
        var episodeRatingId = Guid.NewGuid();
        var mediaReviewId = Guid.NewGuid();
        var seasonReviewId = Guid.NewGuid();
        var episodeReviewId = Guid.NewGuid();

        await factory.WithDbAsync(db =>
        {
            db.Media.Add(new Media
            {
                Id = mediaId,
                Type = MediaType.TvSeries,
                Title = "Review API Series",
                CreatedAt = DateTime.UtcNow
            });
            db.TvSeries.Add(new TvSeries { MediaId = mediaId, SeasonsCount = 1 });
            db.Seasons.Add(new Season
            {
                Id = seasonId,
                TvSeriesId = mediaId,
                SeasonNumber = 2
            });
            db.Episodes.Add(new Episode
            {
                Id = episodeId,
                SeasonId = seasonId,
                EpisodeNumber = 4,
                Title = "The API Episode",
                Duration = 44
            });

            db.Ratings.AddRange(
                new Rating
                {
                    Id = mediaRatingId,
                    UserId = userId,
                    MediaId = mediaId,
                    Value = 6,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rating
                {
                    Id = seasonRatingId,
                    UserId = userId,
                    SeasonId = seasonId,
                    Value = 7,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new Rating
                {
                    Id = episodeRatingId,
                    UserId = userId,
                    EpisodeId = episodeId,
                    Value = 9,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

            db.Reviews.AddRange(
                new Review
                {
                    Id = mediaReviewId,
                    UserId = userId,
                    MediaId = mediaId,
                    RatingId = mediaRatingId,
                    Content = "Series API review",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-3)
                },
                new Review
                {
                    Id = seasonReviewId,
                    UserId = userId,
                    MediaId = mediaId,
                    RatingId = seasonRatingId,
                    Content = "Season API review",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-2)
                },
                new Review
                {
                    Id = episodeReviewId,
                    UserId = userId,
                    MediaId = mediaId,
                    RatingId = episodeRatingId,
                    Content = "Episode API review",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-1)
                });

            return Task.CompletedTask;
        });

        return new TargetAwareReviewIds(
            mediaId,
            seasonId,
            episodeId,
            mediaReviewId,
            seasonReviewId,
            episodeReviewId);
    }

    private sealed record TargetAwareReviewIds(
        Guid MediaId,
        Guid SeasonId,
        Guid EpisodeId,
        Guid MediaReviewId,
        Guid SeasonReviewId,
        Guid EpisodeReviewId);

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
