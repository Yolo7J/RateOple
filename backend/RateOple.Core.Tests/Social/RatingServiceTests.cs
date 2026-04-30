using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.Social;

public class RatingServiceTests
{
    [Fact]
    public async Task RateMediaAsync_CreatesRatingAndRefreshesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        var rating = await service.RateMediaAsync(userId, mediaId, 8);

        Assert.Equal(8, rating.Value);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(1, media!.RatingsCount);
        Assert.Equal(8, media.AverageRating);
    }

    [Fact]
    public async Task RateMediaAsync_UpdatesExistingRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await service.RateMediaAsync(userId, mediaId, 4);
        var updated = await service.RateMediaAsync(userId, mediaId, 9);

        Assert.Equal(9, updated.Value);
        Assert.Single(db.Context.Ratings);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(1, media!.RatingsCount);
        Assert.Equal(9, media.AverageRating);
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_RemovesRatingAndRefreshesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await service.RateMediaAsync(userId, mediaId, 6);
        await service.DeleteMediaRatingAsync(userId, mediaId);

        Assert.Empty(db.Context.Ratings);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(0, media!.RatingsCount);
        Assert.Equal(0, media.AverageRating);
    }

    [Fact]
    public async Task RateMediaAsync_RejectsInvalidRatingValue()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => service.RateMediaAsync(userId, mediaId, 11));
    }

    [Fact]
    public async Task RateMediaAsync_CreatingRatingTriggersTasteRecalculation()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await service.RateMediaAsync(userId, mediaId, 8);

        Assert.Equal((userId, mediaId), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task RateMediaAsync_UpdatingRatingTriggersTasteRecalculation()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);
        await service.RateMediaAsync(userId, mediaId, 4);
        taste.RecalculateMediaContextCalls.Clear();

        await service.RateMediaAsync(userId, mediaId, 9);

        Assert.Equal((userId, mediaId), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_RemovingRatingTriggersTasteRecalculation()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);
        await service.RateMediaAsync(userId, mediaId, 6);
        taste.RecalculateMediaContextCalls.Clear();

        await service.DeleteMediaRatingAsync(userId, mediaId);

        Assert.Equal((userId, mediaId), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_MissingRatingDoesNotRecalculateTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await service.DeleteMediaRatingAsync(userId, mediaId);

        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task RateSeasonAsync_CreatingRatingTriggersTasteRecalculationForSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-rating-flow-user"));
        var series = data.Media.TvSeries("Season Rating Flow Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await service.RateSeasonAsync(user.Id, season.Id, 8);

        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task RateEpisodeAsync_CreatingRatingTriggersTasteRecalculationForSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-rating-flow-user"));
        var series = data.Media.TvSeries("Episode Rating Flow Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await service.RateEpisodeAsync(user.Id, episode.Id, 8);

        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task RateSeasonAsync_DeletedParentSeriesDoesNotCreateRatingInteractionOrTasteSignal()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-season-rating-user"));
        var series = data.Media.TvSeries("Deleted Parent Rating Series", isDeleted: true);
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RateSeasonAsync(user.Id, season.Id, 8));

        Assert.Empty(db.Context.Ratings);
        Assert.Empty(interaction.RatingCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task RateEpisodeAsync_DeletedSeasonDoesNotCreateRatingInteractionOrTasteSignal()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-season-episode-rating-user"));
        var series = data.Media.TvSeries("Deleted Season Rating Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, isDeleted: true);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RateEpisodeAsync(user.Id, episode.Id, 8));

        Assert.Empty(db.Context.Ratings);
        Assert.Empty(interaction.RatingCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task RateEpisodeAsync_DeletedParentSeriesDoesNotCreateRatingInteractionOrTasteSignal()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-episode-rating-user"));
        var series = data.Media.TvSeries("Deleted Parent Episode Rating Series", isDeleted: true);
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RateEpisodeAsync(user.Id, episode.Id, 8));

        Assert.Empty(db.Context.Ratings);
        Assert.Empty(interaction.RatingCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task RateMediaAsync_FailedValidationDoesNotRecalculateTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => service.RateMediaAsync(userId, mediaId, 0));

        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task RateMediaAsync_DeletedMediaDoesNotRecalculateTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-rating-flow-user"));
        var media = data.Media.Movie("Deleted Rating Flow Movie", isDeleted: true);
        await data.SaveAsync();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RateMediaAsync(user.Id, media.Id, 8));

        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    private static RatingService CreateService(
        SqliteTestDb db,
        IInteractionService? interactionService = null,
        IUserTasteService? userTasteService = null)
    {
        return new RatingService(
            db.Context,
            interactionService ?? new NoopInteractionService(),
            userTasteService ?? new NoopUserTasteService());
    }

    private static async Task<(Guid UserId, Guid MediaId)> SeedUserAndMediaAsync(SqliteTestDb db)
    {
        var userId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();

        db.Context.Users.Add(new User
        {
            Id = userId,
            UserName = "rating-user",
            Email = "rating-user@example.com"
        });
        db.Context.Media.Add(new MediaEntity
        {
            Id = mediaId,
            Type = MediaType.Movie,
            Title = "Test Movie",
            CreatedAt = DateTime.UtcNow
        });
        await db.Context.SaveChangesAsync();

        return (userId, mediaId);
    }
}
