using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.Social;

public class RatingServiceTransactionTests
{
    [Fact]
    public async Task RateMediaAsync_WhenRatingCreatedInteractionThrows_RollsBackRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, media) = await SeedUserAndMediaAsync(db);
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interactionService: interaction);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RateMediaAsync(user.Id, media.Id, 8));

        Assert.Equal(ThrowingInteractionService.RatingCreatedFailureMessage, ex.Message);
        Assert.Equal(1, interaction.RatingCreatedCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Ratings.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, media.Id);
        Assert.Equal(0, aggregate.AverageRating);
        Assert.Equal(0, aggregate.RatingsCount);
    }

    [Fact]
    public async Task RateMediaAsync_WhenInteractionTasteRecalculationThrows_RollsBackRatingInteractionAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, media) = await SeedUserAndMediaAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(
            db,
            interactionService: new InteractionService(db.Context, taste),
            userTasteService: new NoopUserTasteService());

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RateMediaAsync(user.Id, media.Id, 8));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        Assert.Equal(1, taste.RecalculateMediaContextCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Ratings.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, media.Id);
        Assert.Equal(0, aggregate.AverageRating);
        Assert.Equal(0, aggregate.RatingsCount);
    }

    [Fact]
    public async Task RateMediaAsync_WhenUpdatingRatingTasteRecalculationThrows_RollsBackRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, media) = await SeedUserAndRatedMediaAsync(db, ratingValue: 8);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RateMediaAsync(user.Id, media.Id, 4));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Equal(8, await db.Context.Ratings.Where(r => r.UserId == user.Id && r.MediaId == media.Id).Select(r => r.Value).SingleAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, media.Id);
        Assert.Equal(8, aggregate.AverageRating);
        Assert.Equal(1, aggregate.RatingsCount);
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_WhenTasteRecalculationThrows_RollsBackRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, media) = await SeedUserAndRatedMediaAsync(db, ratingValue: 8, withReview: true);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DeleteMediaRatingAsync(user.Id, media.Id));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.NotNull(await db.Context.Ratings.SingleOrDefaultAsync(r => r.UserId == user.Id && r.MediaId == media.Id));
        Assert.Single(await db.Context.Reviews.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, media.Id);
        Assert.Equal(8, aggregate.AverageRating);
        Assert.Equal(1, aggregate.RatingsCount);
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_WhenRatingIsMissing_DoesNotCallTasteSideEffects()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, media) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var interaction = new SpyInteractionService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await service.DeleteMediaRatingAsync(user.Id, media.Id);

        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(interaction.RatingCreatedCalls);
        Assert.Empty(await db.Context.Ratings.ToListAsync());
    }

    [Fact]
    public async Task RateSeasonAsync_WhenTasteRecalculationThrows_RollsBackSeasonRatingAndSeriesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, series, season) = await SeedSeasonTargetAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RateSeasonAsync(user.Id, season.Id, 7));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Ratings.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, series.Id);
        Assert.Equal(0, aggregate.AverageRating);
        Assert.Equal(0, aggregate.RatingsCount);
    }

    [Fact]
    public async Task RateEpisodeAsync_WhenTasteRecalculationThrows_RollsBackEpisodeRatingAndSeriesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (user, series, _, episode) = await SeedEpisodeTargetAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RateEpisodeAsync(user.Id, episode.Id, 9));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Ratings.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        var aggregate = await LoadAggregateAsync(db, series.Id);
        Assert.Equal(0, aggregate.AverageRating);
        Assert.Equal(0, aggregate.RatingsCount);
    }

    private static RatingService CreateService(
        SqliteTestDb db,
        IInteractionService? interactionService = null,
        IUserTasteService? userTasteService = null) => new(
            db.Context,
            interactionService ?? new NoopInteractionService(),
            userTasteService ?? new NoopUserTasteService());

    private static async Task<(User User, MediaEntity Media)> SeedUserAndMediaAsync(SqliteTestDb db)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("rating-transaction-user"));
        var media = data.Media.Movie("Rating Transaction Movie");
        await data.SaveAsync();
        return (user, media);
    }

    private static async Task<(User User, MediaEntity Media)> SeedUserAndRatedMediaAsync(
        SqliteTestDb db,
        int ratingValue,
        bool withReview = false)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("rated-transaction-user"));
        var media = data.Media.Movie(
            "Rated Transaction Movie",
            averageRating: ratingValue,
            ratingsCount: 1);
        var rating = data.Reviews.RatingForMedia(user, media, ratingValue);
        if (withReview)
            data.Reviews.Review(user, media, rating, "Linked review");

        await data.SaveAsync();
        return (user, media);
    }

    private static async Task<(User User, MediaEntity Series, Season Season)> SeedSeasonTargetAsync(SqliteTestDb db)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-rating-transaction-user"));
        var series = data.Media.TvSeries("Season Rating Transaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        return (user, series, season);
    }

    private static async Task<(User User, MediaEntity Series, Season Season, Episode Episode)> SeedEpisodeTargetAsync(SqliteTestDb db)
    {
        var (user, series, season) = await SeedSeasonTargetAsync(db);
        var data = new TestDataFactory(db.Context);
        var episode = await data.Media.CreateEpisodeAsync(season);
        return (user, series, season, episode);
    }

    private static Task<RatingAggregate> LoadAggregateAsync(SqliteTestDb db, Guid mediaId)
    {
        return db.Context.Media
            .Where(m => m.Id == mediaId)
            .Select(m => new RatingAggregate(m.AverageRating, m.RatingsCount))
            .SingleAsync();
    }

    private sealed record RatingAggregate(double AverageRating, int RatingsCount);
}
