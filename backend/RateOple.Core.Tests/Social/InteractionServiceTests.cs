using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Social;

public class InteractionServiceTests
{
    [Fact]
    public async Task TrackMediaOpenedAsync_CreatesInteractionForExistingMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("interaction-user"));
        var media = data.Media.Movie("Opened Movie");
        await data.SaveAsync();
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);
        var before = DateTime.UtcNow;

        await service.TrackMediaOpenedAsync(user.Id, media.Id);

        var after = DateTime.UtcNow;
        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Equal(user.Id, interaction.UserId);
        Assert.Equal(media.Id, interaction.MediaId);
        Assert.Null(interaction.SeasonId);
        Assert.Null(interaction.EpisodeId);
        Assert.Equal(InteractionType.MediaOpened, interaction.InteractionType);
        Assert.Equal(1, interaction.Points);
        Assert.InRange(interaction.CreatedAt, before.AddSeconds(-1), after.AddSeconds(1));
        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_RejectsUnknownUser()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var media = await data.Media.CreateMovieAsync("Known Movie");
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackMediaOpenedAsync(Guid.NewGuid(), media.Id));

        Assert.Empty(db.Context.MediaInteractions);
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_RejectsMissingMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-media-user"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackMediaOpenedAsync(user.Id, Guid.NewGuid()));

        Assert.Empty(db.Context.MediaInteractions);
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_RejectsDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-media-user"));
        var media = data.Media.Movie("Deleted Movie", isDeleted: true);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackMediaOpenedAsync(user.Id, media.Id));

        Assert.Empty(db.Context.MediaInteractions);
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_AppendsRepeatedInteractionsForSameUserAndMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("repeat-user"));
        var media = data.Media.Movie("Repeated Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.TrackMediaOpenedAsync(user.Id, media.Id);
        await service.TrackMediaOpenedAsync(user.Id, media.Id);

        var interactions = await db.Context.MediaInteractions
            .OrderBy(x => x.CreatedAt)
            .ToListAsync();
        Assert.Equal(2, interactions.Count);
        Assert.All(interactions, interaction =>
        {
            Assert.Equal(user.Id, interaction.UserId);
            Assert.Equal(media.Id, interaction.MediaId);
            Assert.Equal(InteractionType.MediaOpened, interaction.InteractionType);
        });
    }

    [Fact]
    public async Task TrackRatingAndReviewAndStatusInteractions_CanCoexistForSameUserAndMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("multi-type-user"));
        var media = data.Media.Movie("Multi Type Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.TrackRatingCreatedAsync(user.Id, media.Id, null, null);
        await service.TrackReviewCreatedAsync(user.Id, media.Id, null, null);
        await service.TrackMediaStatusChangedAsync(user.Id, media.Id);

        var interactions = await db.Context.MediaInteractions
            .OrderBy(x => x.InteractionType)
            .ToListAsync();
        Assert.Collection(
            interactions,
            rating =>
            {
                Assert.Equal(InteractionType.RatingCreated, rating.InteractionType);
                Assert.Equal(5, rating.Points);
            },
            review =>
            {
                Assert.Equal(InteractionType.ReviewCreated, review.InteractionType);
                Assert.Equal(8, review.Points);
            },
            status =>
            {
                Assert.Equal(InteractionType.MediaStatusChanged, status.InteractionType);
                Assert.Equal(4, status.Points);
            });
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_WorksForMoviesBooksAndTvSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("all-media-user"));
        var movie = data.Media.Movie("Open Movie");
        var book = data.Media.Book("Open Book");
        var series = data.Media.TvSeries("Open Series");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.TrackMediaOpenedAsync(user.Id, movie.Id);
        await service.TrackMediaOpenedAsync(user.Id, book.Id);
        await service.TrackMediaOpenedAsync(user.Id, series.Id);

        var mediaIds = await db.Context.MediaInteractions
            .OrderBy(x => x.Media!.Title)
            .Select(x => x.MediaId!.Value)
            .ToListAsync();
        Assert.Equal(new[] { book.Id, movie.Id, series.Id }, mediaIds);
    }

    [Fact]
    public async Task TrackRatingCreatedAsync_RejectsMultipleTargets()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.TrackRatingCreatedAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), null));
    }

    [Fact]
    public async Task TrackRatingCreatedAsync_RejectsMissingTarget()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(
            () => service.TrackRatingCreatedAsync(Guid.NewGuid(), null, null, null));
    }

    [Fact]
    public async Task TrackRatingCreatedAsync_ForSeasonStoresSeasonAndRecalculatesParentSeriesTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-interaction-user"));
        var series = data.Media.TvSeries("Season Interaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await service.TrackRatingCreatedAsync(user.Id, null, season.Id, null);

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Null(interaction.MediaId);
        Assert.Equal(season.Id, interaction.SeasonId);
        Assert.Null(interaction.EpisodeId);
        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task TrackRatingCreatedAsync_RejectsSeasonWhoseParentSeriesIsDeletedWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-season-interaction-user"));
        var series = data.Media.TvSeries("Deleted Parent Interaction Series", isDeleted: true);
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackRatingCreatedAsync(user.Id, null, season.Id, null));

        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task TrackReviewCreatedAsync_ForEpisodeStoresEpisodeAndRecalculatesParentSeriesTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-interaction-user"));
        var series = data.Media.TvSeries("Episode Interaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await service.TrackReviewCreatedAsync(user.Id, null, null, episode.Id);

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Null(interaction.MediaId);
        Assert.Null(interaction.SeasonId);
        Assert.Equal(episode.Id, interaction.EpisodeId);
        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task TrackReviewCreatedAsync_RejectsEpisodeWhoseSeasonIsDeletedWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-season-episode-interaction-user"));
        var series = data.Media.TvSeries("Deleted Season Interaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, isDeleted: true);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackReviewCreatedAsync(user.Id, null, null, episode.Id));

        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    [Fact]
    public async Task TrackReviewCreatedAsync_RejectsEpisodeWhoseParentSeriesIsDeletedWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-episode-interaction-user"));
        var series = data.Media.TvSeries("Deleted Parent Episode Interaction Series", isDeleted: true);
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackReviewCreatedAsync(user.Id, null, null, episode.Id));

        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(taste.RecalculateMediaContextCalls);
    }

    private static InteractionService CreateService(SqliteTestDb db) =>
        new(db.Context, new SpyUserTasteService());
}
