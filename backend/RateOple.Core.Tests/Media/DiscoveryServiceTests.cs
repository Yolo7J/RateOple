using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Media.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Media;

public class DiscoveryServiceTests
{
    [Fact]
    public async Task GetTrendingAsync_HandlesEmptyDatabase()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetTrendingAsync_ReturnsNonDeletedMediaOnly()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("Visible movie", averageRating: 7, ratingsCount: 2);
        await data.Discovery.CreateDeletedDiscoverableMediaAsync("Deleted movie", averageRating: 10, ratingsCount: 50);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Equal(["Visible movie"], result.Select(x => x.Title));
    }

    [Fact]
    public async Task GetTrendingAsync_ExcludesDeletedMediaEvenWithStrongSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("trending-signals-user"));
        await data.SaveAsync();
        var visible = await data.Discovery.CreatePopularMediaAsync("Visible signal movie", averageRating: 6, ratingsCount: 1);
        var deleted = await data.Discovery.CreateDeletedDiscoverableMediaAsync("Deleted signal movie", averageRating: 10, ratingsCount: 99);
        await data.Discovery.CreateInteractionAsync(user, deleted, points: 500);
        await data.Discovery.CreateInteractionAsync(user, visible, points: 1);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.DoesNotContain(result, x => x.Id == deleted.Id);
        Assert.Contains(result, x => x.Id == visible.Id);
    }

    [Fact]
    public async Task GetTrendingAsync_OrdersByInteractionRatingsAndAverageRatingScore()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("trending-score-user"));
        await data.SaveAsync();
        var interactionWinner = await data.Discovery.CreatePopularMediaAsync("Interaction winner", averageRating: 1, ratingsCount: 1);
        var ratingWinner = await data.Discovery.CreateMediaWithRatingAsync(user, "Recent rating winner", averageRating: 7, ratingsCount: 1);
        var averageWinner = await data.Discovery.CreatePopularMediaAsync("Average winner", averageRating: 6, ratingsCount: 1);
        await data.Discovery.CreateInteractionAsync(user, interactionWinner, points: 30);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Equal(
            [interactionWinner.Id, ratingWinner.Id, averageWinner.Id],
            result.Select(x => x.Id).ToList());
    }

    [Fact]
    public async Task GetTrendingAsync_IgnoresOldInteractionsAndRatings()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("trending-old-user"));
        await data.SaveAsync();
        var oldSignal = await data.Discovery.CreateMediaWithRatingAsync(
            user,
            "Old signal movie",
            averageRating: 1,
            ratingsCount: 1,
            ratingUpdatedAt: DateTime.UtcNow.AddDays(-30));
        await data.Discovery.CreateInteractionAsync(user, oldSignal, points: 100, createdAt: DateTime.UtcNow.AddDays(-30));
        var recentSignal = await data.Discovery.CreatePopularMediaAsync("Recent average movie", averageRating: 2, ratingsCount: 1);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Equal(recentSignal.Id, result[0].Id);
    }

    [Fact]
    public async Task GetTrendingAsync_UsesDeterministicTitleOrderingWhenScoresTie()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("Beta", averageRating: 5, ratingsCount: 2);
        await data.Discovery.CreatePopularMediaAsync("Alpha", averageRating: 5, ratingsCount: 2);
        await data.Discovery.CreatePopularMediaAsync("Gamma", averageRating: 5, ratingsCount: 2);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Equal(["Alpha", "Beta", "Gamma"], result.Select(x => x.Title));
    }

    [Fact]
    public async Task GetTrendingAsync_RespectsLimitAndNormalizesNonPositiveLimit()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("A", averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("B", averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("C", averageRating: 5, ratingsCount: 1);
        var service = CreateService(db);

        var limited = await service.GetTrendingAsync(2);
        var none = await service.GetTrendingAsync(0);

        Assert.Equal(2, limited.Count);
        Assert.Empty(none);
    }

    [Fact]
    public async Task GetTrendingAsync_IncludesMoviesBooksAndTvSeries()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("Movie", MediaType.Movie, averageRating: 8, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("Book", MediaType.Book, averageRating: 8, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("Series", MediaType.TvSeries, averageRating: 8, ratingsCount: 1);
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        Assert.Equal(["Book", "Movie", "Series"], result.Select(x => x.Title));
        Assert.Equal(["Book", "Movie", "TvSeries"], result.Select(x => x.Type));
    }

    [Fact]
    public async Task GetTrendingAsync_MapsRequiredDisplayFields()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var tag = await data.Tags.CreateTagAsync("noir");
        var media = data.Media.Movie("Display Movie", releaseYear: 1995, genres: [drama], tags: [tag], averageRating: 8.5, ratingsCount: 3);
        await data.SaveAsync();
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        var item = Assert.Single(result);
        Assert.Equal(media.Id, item.Id);
        Assert.Equal("Display Movie", item.Title);
        Assert.Equal("Movie", item.Type);
        Assert.Equal("https://example.test/Display%20Movie.jpg", item.CoverUrl);
        Assert.Equal(1995, item.ReleaseYear);
        Assert.Equal(8.5, item.AverageRating);
        Assert.Equal(3, item.RatingsCount);
        Assert.Equal(["Drama"], item.Genres);
        Assert.Equal(["noir"], item.Tags);
    }

    [Fact]
    public async Task GetTrendingAsync_DoesNotThrowWhenMediaHasNoSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var media = await data.Media.CreateMovieAsync("Sparse Movie");
        var service = CreateService(db);

        var result = await service.GetTrendingAsync();

        var item = Assert.Single(result);
        Assert.Equal(media.Id, item.Id);
        Assert.Equal(0, item.AverageRating);
        Assert.Equal(0, item.RatingsCount);
    }

    private static DiscoveryService CreateService(SqliteTestDb db) => new(db.Context);
}
