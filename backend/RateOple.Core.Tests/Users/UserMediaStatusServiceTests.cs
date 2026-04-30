using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Tests.TestSupport;
using RateOple.Core.Users.DTOs;
using RateOple.Core.Users.Services;

namespace RateOple.Core.Tests.Users;

public class UserMediaStatusServiceTests
{
    [Fact]
    public async Task SetStatusAsync_CreatesStatusForExistingMovie()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-user"));
        var movie = data.Media.Movie("Status Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        var status = await service.SetStatusAsync(user.Id, movie.Id, new SetUserMediaStatusDto
        {
            Status = "On it",
            ProgressPages = 30,
            ProgressSeason = 2
        });

        Assert.Equal(movie.Id, status.MediaId);
        Assert.Equal("Movie", status.MediaType);
        Assert.Equal("Status Movie", status.Title);
        Assert.Equal("On it", status.Status);
        Assert.Null(status.ProgressPages);
        Assert.Null(status.ProgressSeason);
        Assert.Null(status.ProgressEpisode);
        Assert.Single(await db.Context.UserMediaStatuses.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_CreatesBookProgressOnlyForBooks()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("book-status-user"));
        var book = data.Media.Book("Status Book");
        await data.SaveAsync();
        var service = CreateService(db);

        var status = await service.SetStatusAsync(user.Id, book.Id, new SetUserMediaStatusDto
        {
            Status = "Done",
            ProgressPages = 250,
            ProgressSeason = 1,
            ProgressEpisode = 2
        });

        Assert.Equal("Book", status.MediaType);
        Assert.Equal("Done", status.Status);
        Assert.Equal(250, status.ProgressPages);
        Assert.Null(status.ProgressSeason);
        Assert.Null(status.ProgressEpisode);
    }

    [Fact]
    public async Task SetStatusAsync_CreatesTvProgressOnlyForTvSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("tv-status-user"));
        var series = data.Media.TvSeries("Status Series");
        await data.SaveAsync();
        var service = CreateService(db);

        var status = await service.SetStatusAsync(user.Id, series.Id, new SetUserMediaStatusDto
        {
            Status = "On it",
            ProgressPages = 120,
            ProgressSeason = 2,
            ProgressEpisode = 6
        });

        Assert.Equal("TvSeries", status.MediaType);
        Assert.Null(status.ProgressPages);
        Assert.Equal(2, status.ProgressSeason);
        Assert.Equal(6, status.ProgressEpisode);
    }

    [Fact]
    public async Task SetStatusAsync_UpdatesExistingStatusForSameUserAndMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-updater"));
        var book = data.Media.Book("Tracked Book");
        await data.Statuses.CreateMediaStatusAsync(user, book, MediaProgressStatus.Plan, progressPages: 10);
        var service = CreateService(db);

        var status = await service.SetStatusAsync(user.Id, book.Id, new SetUserMediaStatusDto
        {
            Status = "Done",
            ProgressPages = 321
        });

        Assert.Equal("Done", status.Status);
        Assert.Equal(321, status.ProgressPages);
        Assert.Single(await db.Context.UserMediaStatuses.ToListAsync());
    }

    [Fact]
    public async Task SetStatusAsync_DifferentUsersCanTrackSameMediaIndependently()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var firstUser = data.Users.Add(data.Users.Normal("first-status-user"));
        var secondUser = data.Users.Add(data.Users.Normal("second-status-user"));
        var movie = data.Media.Movie("Shared Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.SetStatusAsync(firstUser.Id, movie.Id, new SetUserMediaStatusDto { Status = "Plan" });
        await service.SetStatusAsync(secondUser.Id, movie.Id, new SetUserMediaStatusDto { Status = "Dropped" });

        var stored = await db.Context.UserMediaStatuses.OrderBy(x => x.UserId).ToListAsync();
        Assert.Equal(2, stored.Count);
        Assert.Contains(stored, x => x.UserId == firstUser.Id && x.Status == MediaProgressStatus.Plan);
        Assert.Contains(stored, x => x.UserId == secondUser.Id && x.Status == MediaProgressStatus.Dropped);
    }

    [Fact]
    public async Task SetStatusAsync_RejectsNonexistentMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-media-status-user"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SetStatusAsync(user.Id, Guid.NewGuid(), new SetUserMediaStatusDto
        {
            Status = "Plan"
        }));
    }

    [Fact]
    public async Task SetStatusAsync_RejectsDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-media-status-user"));
        var deleted = data.Media.Movie("Deleted Status Movie", isDeleted: true);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SetStatusAsync(user.Id, deleted.Id, new SetUserMediaStatusDto
        {
            Status = "Plan"
        }));
    }

    [Fact]
    public async Task SetStatusAsync_RejectsInvalidStatusValue()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("invalid-status-user"));
        var movie = data.Media.Movie("Invalid Status Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.SetStatusAsync(user.Id, movie.Id, new SetUserMediaStatusDto
        {
            Status = "finished"
        }));
    }

    [Fact]
    public async Task SetStatusAsync_NormalizesNegativeProgressToZero()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("progress-status-user"));
        var book = data.Media.Book("Progress Book");
        await data.SaveAsync();
        var service = CreateService(db);

        var status = await service.SetStatusAsync(user.Id, book.Id, new SetUserMediaStatusDto
        {
            Status = "On_it",
            ProgressPages = -5
        });

        Assert.Equal("On it", status.Status);
        Assert.Equal(0, status.ProgressPages);
    }

    [Fact]
    public async Task GetUserStatusesAsync_ReturnsOnlyOwnStatuses()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-reader"));
        var other = data.Users.Add(data.Users.Normal("other-status-reader"));
        var ownMovie = data.Media.Movie("Own Movie");
        var otherMovie = data.Media.Movie("Other Movie");
        await data.Statuses.CreateMediaStatusAsync(user, ownMovie, MediaProgressStatus.Plan);
        await data.Statuses.CreateMediaStatusAsync(other, otherMovie, MediaProgressStatus.Done);
        var service = CreateService(db);

        var statuses = await service.GetUserStatusesAsync(user.Id, new MediaStatusQueryDto());

        Assert.Single(statuses);
        Assert.Equal(ownMovie.Id, statuses[0].MediaId);
    }

    [Fact]
    public async Task GetUserStatusesAsync_FiltersByStatus()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-filter-user"));
        var planned = data.Media.Movie("Planned Movie");
        var done = data.Media.Movie("Done Movie");
        await data.Statuses.CreateMediaStatusAsync(user, planned, MediaProgressStatus.Plan);
        await data.Statuses.CreateMediaStatusAsync(user, done, MediaProgressStatus.Done);
        var service = CreateService(db);

        var statuses = await service.GetUserStatusesAsync(user.Id, new MediaStatusQueryDto { Status = "Done" });

        Assert.Single(statuses);
        Assert.Equal(done.Id, statuses[0].MediaId);
        Assert.Equal("Done", statuses[0].Status);
    }

    [Fact]
    public async Task GetUserStatusesAsync_ExcludesDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("hidden-status-user"));
        var visible = data.Media.Movie("Visible Status Movie");
        var deleted = data.Media.Movie("Deleted Status Movie", isDeleted: true);
        await data.Statuses.CreateMediaStatusAsync(user, visible, MediaProgressStatus.Plan);
        await data.Statuses.CreateMediaStatusAsync(user, deleted, MediaProgressStatus.Done);
        var service = CreateService(db);

        var statuses = await service.GetUserStatusesAsync(user.Id, new MediaStatusQueryDto());

        Assert.Single(statuses);
        Assert.Equal(visible.Id, statuses[0].MediaId);
    }

    [Fact]
    public async Task GetUserStatusesAsync_PaginatesAndOrdersByUpdatedAtDescending()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-paging-user"));
        var oldest = data.Media.Movie("Oldest Movie");
        var middle = data.Media.Movie("Middle Movie");
        var newest = data.Media.Movie("Newest Movie");
        await data.Statuses.CreateMediaStatusAsync(user, oldest, updatedAt: DateTime.UtcNow.AddHours(-3));
        await data.Statuses.CreateMediaStatusAsync(user, middle, updatedAt: DateTime.UtcNow.AddHours(-2));
        await data.Statuses.CreateMediaStatusAsync(user, newest, updatedAt: DateTime.UtcNow.AddHours(-1));
        var service = CreateService(db);

        var statuses = await service.GetUserStatusesAsync(user.Id, new MediaStatusQueryDto
        {
            Page = 2,
            PageSize = 1
        });

        Assert.Single(statuses);
        Assert.Equal(middle.Id, statuses[0].MediaId);
        Assert.Equal("Middle Movie", statuses[0].Title);
    }

    [Fact]
    public async Task GetUserStatusesAsync_NormalizesPagination()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("status-pagination-user"));
        var movie = data.Media.Movie("Paged Movie");
        await data.Statuses.CreateMediaStatusAsync(user, movie, MediaProgressStatus.Plan);
        var service = CreateService(db);

        var statuses = await service.GetUserStatusesAsync(user.Id, new MediaStatusQueryDto
        {
            Page = -1,
            PageSize = 0
        });

        Assert.Single(statuses);
    }

    private static UserMediaStatusService CreateService(SqliteTestDb db) => new(db.Context);
}
