using Microsoft.EntityFrameworkCore;
using RateOple.Core.Media.DTOs;
using RateOple.Core.Media.Services;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Media;

public class TvSeriesServiceTests
{
    [Fact]
    public async Task AddSeasonAsync_AddsSeasonWithEpisodesToTvSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = await data.Media.CreateTvSeriesAsync("Series");
        var service = CreateService(db);

        var season = await service.AddSeasonAsync(series.Id, new UpsertSeasonDto
        {
            SeasonNumber = 1,
            Episodes =
            [
                new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Pilot", Duration = 45 }
            ]
        });

        Assert.Equal(1, season.SeasonNumber);
        Assert.Single(season.Episodes);
        Assert.Equal("Pilot", season.Episodes[0].Title);
        Assert.Equal(1, await db.Context.TvSeries.Where(tv => tv.MediaId == series.Id).Select(tv => tv.SeasonsCount).SingleAsync());
    }

    [Fact]
    public async Task AddSeasonAsync_RejectsMissingNonTvDuplicateAndInvalidSeasonNumbers()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var movie = await data.Media.CreateMovieAsync("Movie");
        var series = await data.Media.CreateTvSeriesAsync("Series");
        var service = CreateService(db);

        await service.AddSeasonAsync(series.Id, new UpsertSeasonDto { SeasonNumber = 1 });

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddSeasonAsync(
            Guid.NewGuid(),
            new UpsertSeasonDto { SeasonNumber = 1 }));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddSeasonAsync(
            movie.Id,
            new UpsertSeasonDto { SeasonNumber = 1 }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AddSeasonAsync(
            series.Id,
            new UpsertSeasonDto { SeasonNumber = 1 }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.AddSeasonAsync(
            series.Id,
            new UpsertSeasonDto { SeasonNumber = 0 }));
    }

    [Fact]
    public async Task AddSeasonAsync_RejectsDuplicateEpisodeNumbersInPayload()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = await data.Media.CreateTvSeriesAsync("Series");
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.AddSeasonAsync(series.Id, new UpsertSeasonDto
        {
            SeasonNumber = 1,
            Episodes =
            [
                new UpsertEpisodeDto { EpisodeNumber = 1, Title = "One" },
                new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Duplicate" }
            ]
        }));
    }

    [Fact]
    public async Task UpdateSeasonAsync_RenamesSeasonNumberAndUpsertsEpisodes()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        await data.Media.CreateEpisodeAsync(season, 1, "Old");
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        var updated = await service.UpdateSeasonAsync(series.Id, 1, new UpsertSeasonDto
        {
            SeasonNumber = 2,
            Episodes =
            [
                new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Updated", Duration = 50 },
                new UpsertEpisodeDto { EpisodeNumber = 2, Title = "New", Duration = 48 }
            ]
        });

        Assert.Equal(2, updated.SeasonNumber);
        Assert.Equal(2, updated.Episodes.Count);
        Assert.Contains(updated.Episodes, e => e.EpisodeNumber == 1 && e.Title == "Updated");
        Assert.Contains(updated.Episodes, e => e.EpisodeNumber == 2 && e.Title == "New");
    }

    [Fact]
    public async Task UpdateSeasonAsync_RejectsMissingDuplicateTargetAndInvalidPayload()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        await data.Media.CreateSeasonAsync(series, 1);
        await data.Media.CreateSeasonAsync(series, 2);
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateSeasonAsync(
            series.Id,
            99,
            new UpsertSeasonDto { SeasonNumber = 99 }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateSeasonAsync(
            series.Id,
            1,
            new UpsertSeasonDto { SeasonNumber = 2 }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateSeasonAsync(
            series.Id,
            1,
            new UpsertSeasonDto
            {
                SeasonNumber = 1,
                Episodes = [new UpsertEpisodeDto { EpisodeNumber = 0 }]
            }));
    }

    [Fact]
    public async Task DeleteSeasonAsync_SoftDeletesSeasonAndEpisodesAndHidesThem()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1);
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        await service.DeleteSeasonAsync(series.Id, 1);

        Assert.True(await db.Context.Seasons.Where(s => s.Id == season.Id).Select(s => s.IsDeleted).SingleAsync());
        Assert.True(await db.Context.Episodes.Where(e => e.Id == episode.Id).Select(e => e.IsDeleted).SingleAsync());
        Assert.Empty(await service.GetSeasonsAsync(series.Id));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.DeleteSeasonAsync(series.Id, 1));
    }

    [Fact]
    public async Task AddEpisodeAsync_AddsEpisodeAndProtectsNumbering()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        await data.Media.CreateSeasonAsync(series, 1);
        await data.Media.CreateSeasonAsync(series, 2);
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        var first = await service.AddEpisodeAsync(series.Id, 1, new UpsertEpisodeDto
        {
            EpisodeNumber = 1,
            Title = "Pilot"
        });
        var secondSeasonEpisode = await service.AddEpisodeAsync(series.Id, 2, new UpsertEpisodeDto
        {
            EpisodeNumber = 1,
            Title = "Allowed In Another Season"
        });

        Assert.Equal("Pilot", first.Title);
        Assert.Equal("Allowed In Another Season", secondSeasonEpisode.Title);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.AddEpisodeAsync(
            series.Id,
            1,
            new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Duplicate" }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.AddEpisodeAsync(
            series.Id,
            1,
            new UpsertEpisodeDto { EpisodeNumber = 0 }));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddEpisodeAsync(
            series.Id,
            99,
            new UpsertEpisodeDto { EpisodeNumber = 1 }));
    }

    [Fact]
    public async Task UpdateAndDeleteEpisodeAsync_PatchAndHideEpisode()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1, "Old");
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        var updated = await service.UpdateEpisodeAsync(series.Id, 1, 1, new UpsertEpisodeDto
        {
            EpisodeNumber = 1,
            Title = "Updated",
            Duration = 55
        });
        await service.DeleteEpisodeAsync(series.Id, 1, 1);

        Assert.Equal("Updated", updated.Title);
        Assert.Equal(55, updated.Duration);
        Assert.True(await db.Context.Episodes.Where(e => e.Id == episode.Id).Select(e => e.IsDeleted).SingleAsync());
        var seasons = await service.GetSeasonsAsync(series.Id);
        Assert.Empty(seasons[0].Episodes);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateEpisodeAsync(
            series.Id,
            1,
            1,
            new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Hidden" }));
    }

    [Fact]
    public async Task RatingService_RejectsDeletedSeasonAndEpisodeTargets()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("tv-rating-user"));
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1);
        await data.SaveAsync();
        db.Context.ChangeTracker.Clear();
        var tvService = CreateService(db);
        var ratingService = new RatingService(db.Context, new NoopInteractionService(), new NoopUserTasteService());

        await tvService.DeleteSeasonAsync(series.Id, 1);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => ratingService.RateSeasonAsync(user.Id, season.Id, 8));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => ratingService.RateEpisodeAsync(user.Id, episode.Id, 8));
    }

    [Fact]
    public async Task MetadataUpdates_DoNotResetMediaRatingAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series", averageRating: 7.5, ratingsCount: 3);
        var season = await data.Media.CreateSeasonAsync(series, 1);
        await data.Media.CreateEpisodeAsync(season, 1);
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        await service.UpdateSeasonAsync(series.Id, 1, new UpsertSeasonDto
        {
            SeasonNumber = 1,
            Episodes = [new UpsertEpisodeDto { EpisodeNumber = 1, Title = "Metadata" }]
        });

        var stored = await db.Context.Media.SingleAsync(m => m.Id == series.Id);
        Assert.Equal(7.5, stored.AverageRating);
        Assert.Equal(3, stored.RatingsCount);
    }

    private static TvSeriesService CreateService(SqliteTestDb db) => new(db.Context);
}
