using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Core.Users.DTOs;
using RateOple.Core.Users.Services;

namespace RateOple.Core.Tests.Users;

public class UserMediaStatusTransactionTests
{
    [Fact]
    public async Task SetStatusAsync_WhenInteractionRecordingThrows_RollsBackNewStatus()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMovieAsync(db);
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interaction);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SetStatusAsync(userId, mediaId, new SetUserMediaStatusDto
        {
            Status = "On it"
        }));

        Assert.Equal(ThrowingInteractionService.MediaStatusChangedFailureMessage, ex.Message);
        Assert.Equal(1, interaction.MediaStatusChangedCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.UserMediaStatuses.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_WhenInteractionTasteRecalculationThrows_RollsBackNewStatusAndInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMovieAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, new InteractionService(db.Context, taste));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SetStatusAsync(userId, mediaId, new SetUserMediaStatusDto
        {
            Status = "Done"
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        Assert.Equal(1, taste.RecalculateMediaContextCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.UserMediaStatuses.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_WhenUpdatingStatusInteractionThrows_RollsBackStatusAndProgress()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-update-transaction-user"));
        var book = data.Media.Book("Status Update Transaction Book");
        await data.Statuses.CreateMediaStatusAsync(user, book, MediaProgressStatus.Plan, progressPages: 12);
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interaction);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SetStatusAsync(user.Id, book.Id, new SetUserMediaStatusDto
        {
            Status = "Done",
            ProgressPages = 300
        }));

        Assert.Equal(ThrowingInteractionService.MediaStatusChangedFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        var status = await db.Context.UserMediaStatuses.SingleAsync();
        Assert.Equal(MediaProgressStatus.Plan, status.Status);
        Assert.Equal(12, status.ProgressPages);
        Assert.Null(status.ProgressSeason);
        Assert.Null(status.ProgressEpisode);
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_WhenUpdatingStatusInteractionTasteThrows_RollsBackStatusInteractionAndTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-update-taste-transaction-user"));
        var series = data.Media.TvSeries("Status Update Taste Transaction Series");
        await data.Statuses.CreateMediaStatusAsync(
            user,
            series,
            MediaProgressStatus.OnIt,
            progressSeason: 1,
            progressEpisode: 2);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, new InteractionService(db.Context, taste));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SetStatusAsync(user.Id, series.Id, new SetUserMediaStatusDto
        {
            Status = "Dropped",
            ProgressSeason = 3,
            ProgressEpisode = 4
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        var status = await db.Context.UserMediaStatuses.SingleAsync();
        Assert.Equal(MediaProgressStatus.OnIt, status.Status);
        Assert.Null(status.ProgressPages);
        Assert.Equal(1, status.ProgressSeason);
        Assert.Equal(2, status.ProgressEpisode);
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_WhenMediaValidationFails_DoesNotCallInteractionSideEffects()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-status-target-user"));
        await data.SaveAsync();
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interaction);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SetStatusAsync(user.Id, Guid.NewGuid(), new SetUserMediaStatusDto
        {
            Status = "Plan"
        }));

        Assert.Equal(0, interaction.MediaStatusChangedCalls);
        Assert.Empty(await db.Context.UserMediaStatuses.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_WhenMediaIsDeleted_DoesNotCallInteractionSideEffects()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-status-target-user"));
        var media = data.Media.Movie("Deleted Status Transaction Movie", isDeleted: true);
        await data.SaveAsync();
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interaction);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SetStatusAsync(user.Id, media.Id, new SetUserMediaStatusDto
        {
            Status = "Plan"
        }));

        Assert.Equal(0, interaction.MediaStatusChangedCalls);
        Assert.Empty(await db.Context.UserMediaStatuses.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
    }

    private static UserMediaStatusService CreateService(SqliteTestDb db, IInteractionService interactionService) =>
        new(db.Context, interactionService);

    private static async Task<(Guid UserId, Guid MediaId)> SeedUserAndMovieAsync(SqliteTestDb db)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-transaction-user"));
        var media = data.Media.Movie("Status Transaction Movie");
        await data.SaveAsync();
        return (user.Id, media.Id);
    }
}
