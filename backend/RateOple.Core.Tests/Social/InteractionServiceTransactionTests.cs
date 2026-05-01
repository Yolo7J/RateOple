using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Social;

public class InteractionServiceTransactionTests
{
    [Fact]
    public async Task TrackMediaOpenedAsync_WhenTasteRecalculationThrows_RollsBackInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.TrackMediaOpenedAsync(userId, mediaId));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        Assert.Equal(1, taste.RecalculateMediaContextCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackReviewCreatedAsync_WhenTasteRecalculationThrows_RollsBackInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.TrackReviewCreatedAsync(userId, mediaId, null, null));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackMediaStatusChangedAsync_WhenTasteRecalculationThrows_RollsBackInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.TrackMediaStatusChangedAsync(userId, mediaId));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackRatingCreatedAsync_ForSeasonWhenTasteRecalculationThrows_RollsBackInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-interaction-transaction-user"));
        var series = data.Media.TvSeries("Season Interaction Transaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.TrackRatingCreatedAsync(user.Id, null, season.Id, null));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackReviewCreatedAsync_ForEpisodeWhenTasteRecalculationThrows_RollsBackInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-interaction-transaction-user"));
        var series = data.Media.TvSeries("Episode Interaction Transaction Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.TrackReviewCreatedAsync(user.Id, null, null, episode.Id));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_WhenTargetValidationFails_DoesNotCallTasteSideEffects()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-interaction-target-user"));
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.TrackMediaOpenedAsync(user.Id, Guid.NewGuid()));

        Assert.Equal(0, taste.RecalculateMediaContextCalls);
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task TrackMediaOpenedAsync_PersistsExpectedInteractionWhenTasteSucceeds()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var taste = new SpyUserTasteService();
        var service = new InteractionService(db.Context, taste);

        await service.TrackMediaOpenedAsync(userId, mediaId);

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Equal(InteractionType.MediaOpened, interaction.InteractionType);
        Assert.Equal(userId, interaction.UserId);
        Assert.Equal(mediaId, interaction.MediaId);
        Assert.Equal((userId, mediaId), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    private static async Task<(Guid UserId, Guid MediaId)> SeedUserAndMediaAsync(SqliteTestDb db)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("interaction-transaction-user"));
        var media = data.Media.Movie("Interaction Transaction Movie");
        await data.SaveAsync();
        return (user.Id, media.Id);
    }
}
