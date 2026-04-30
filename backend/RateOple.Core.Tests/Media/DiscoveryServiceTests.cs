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

    [Fact]
    public async Task GetPopularAsync_HandlesEmptyDatabase()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPopularAsync_OrdersByRatingsCountThenAverageRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var mostRated = await data.Discovery.CreatePopularMediaAsync("Most rated", averageRating: 6, ratingsCount: 10);
        var bestRatedTieBreaker = await data.Discovery.CreatePopularMediaAsync("Best average", averageRating: 9, ratingsCount: 5);
        var lowerAverageTie = await data.Discovery.CreatePopularMediaAsync("Lower average", averageRating: 7, ratingsCount: 5);
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Equal(
            [mostRated.Id, bestRatedTieBreaker.Id, lowerAverageTie.Id],
            result.Select(x => x.Id).ToList());
    }

    [Fact]
    public async Task GetPopularAsync_ExcludesDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var visible = await data.Discovery.CreatePopularMediaAsync("Visible popular", averageRating: 7, ratingsCount: 2);
        var deleted = await data.Discovery.CreateDeletedDiscoverableMediaAsync("Deleted popular", averageRating: 10, ratingsCount: 100);
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Equal([visible.Id], result.Select(x => x.Id).ToList());
        Assert.DoesNotContain(result, x => x.Id == deleted.Id);
    }

    [Fact]
    public async Task GetPopularAsync_UsesDeterministicTitleOrderingWhenScoresTie()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("Charlie", averageRating: 8, ratingsCount: 4);
        await data.Discovery.CreatePopularMediaAsync("Alpha", averageRating: 8, ratingsCount: 4);
        await data.Discovery.CreatePopularMediaAsync("Bravo", averageRating: 8, ratingsCount: 4);
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Equal(["Alpha", "Bravo", "Charlie"], result.Select(x => x.Title));
    }

    [Fact]
    public async Task GetPopularAsync_RespectsLimitAndNormalizesNonPositiveLimit()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("A", ratingsCount: 3);
        await data.Discovery.CreatePopularMediaAsync("B", ratingsCount: 2);
        await data.Discovery.CreatePopularMediaAsync("C", ratingsCount: 1);
        var service = CreateService(db);

        var limited = await service.GetPopularAsync(2);
        var none = await service.GetPopularAsync(-1);

        Assert.Equal(2, limited.Count);
        Assert.Empty(none);
    }

    [Fact]
    public async Task GetPopularAsync_IncludesAllMediaTypesAndSparseMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        await data.Discovery.CreatePopularMediaAsync("Movie", MediaType.Movie, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("Book", MediaType.Book, ratingsCount: 1);
        await data.Discovery.CreatePopularMediaAsync("Series", MediaType.TvSeries, ratingsCount: 1);
        await data.Media.CreateMovieAsync("Sparse");
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Equal(["Book", "Movie", "Series", "Sparse"], result.Select(x => x.Title));
        Assert.Equal(["Book", "Movie", "TvSeries", "Movie"], result.Select(x => x.Type));
    }

    [Fact]
    public async Task GetPopularAsync_DoesNotReturnDuplicateMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var mystery = await data.Genres.CreateGenreAsync("Mystery");
        var tag = await data.Tags.CreateTagAsync("featured");
        await data.Discovery.CreateMediaWithGenresAsync("Multi genre", [drama, mystery], ratingsCount: 5);
        await data.Discovery.CreateMediaWithTagsAsync("Tagged", [tag], ratingsCount: 4);
        var service = CreateService(db);

        var result = await service.GetPopularAsync();

        Assert.Equal(result.Count, result.Select(x => x.Id).Distinct().Count());
    }

    [Fact]
    public async Task GetRecommendedAsync_ForNewUserFallsBackToPopularMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("new-recommendation-user"));
        await data.SaveAsync();
        var mostRated = await data.Discovery.CreatePopularMediaAsync("Most rated fallback", averageRating: 6, ratingsCount: 10);
        var bestTie = await data.Discovery.CreatePopularMediaAsync("Best fallback", averageRating: 9, ratingsCount: 5);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal([mostRated.Id, bestTie.Id], result.Select(x => x.Id).ToList());
    }

    [Fact]
    public async Task GetRecommendedAsync_ReturnsNonDeletedMediaOnly()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-recommendation-user"));
        await data.SaveAsync();
        var genre = await data.Genres.CreateGenreAsync("Drama");
        var visible = await data.Discovery.CreateMediaWithGenresAsync("Visible recommendation", [genre], averageRating: 5, ratingsCount: 1);
        var deleted = await data.Discovery.CreateDeletedDiscoverableMediaAsync("Deleted recommendation", genres: [genre]);
        await data.Discovery.CreateUserGenreScoreAsync(user, genre, score: 100);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal([visible.Id], result.Select(x => x.Id).ToList());
        Assert.DoesNotContain(result, x => x.Id == deleted.Id);
    }

    [Fact]
    public async Task GetRecommendedAsync_ExcludesMediaTheUserAlreadyRated()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("rated-recommendation-user"));
        await data.SaveAsync();
        var genre = await data.Genres.CreateGenreAsync("Sci-Fi");
        var rated = await data.Discovery.CreateMediaWithRatingAsync(user, "Already rated", averageRating: 10, ratingsCount: 20, genres: [genre]);
        var candidate = await data.Discovery.CreateMediaWithGenresAsync("Candidate", [genre], averageRating: 7, ratingsCount: 2);
        await data.Discovery.CreateUserGenreScoreAsync(user, genre, score: 20);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal([candidate.Id], result.Select(x => x.Id).ToList());
        Assert.DoesNotContain(result, x => x.Id == rated.Id);
    }

    [Fact]
    public async Task GetRecommendedAsync_ExcludesMediaTheUserCompleted()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("completed-recommendation-user"));
        await data.SaveAsync();
        var completed = await data.Discovery.CreatePopularMediaAsync("Completed", averageRating: 10, ratingsCount: 20);
        var candidate = await data.Discovery.CreatePopularMediaAsync("Candidate", averageRating: 7, ratingsCount: 2);
        await data.Statuses.CreateMediaStatusAsync(user, completed, MediaProgressStatus.Done);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal([candidate.Id], result.Select(x => x.Id).ToList());
        Assert.DoesNotContain(result, x => x.Id == completed.Id);
    }

    [Fact]
    public async Task GetRecommendedAsync_PrefersGenresWithHigherUserTasteScore()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("taste-recommendation-user"));
        await data.SaveAsync();
        var favorite = await data.Genres.CreateGenreAsync("Favorite");
        var neutral = await data.Genres.CreateGenreAsync("Neutral");
        var favoriteMedia = await data.Discovery.CreateMediaWithGenresAsync("Favorite match", [favorite], averageRating: 5, ratingsCount: 1);
        var neutralMedia = await data.Discovery.CreateMediaWithGenresAsync("Neutral match", [neutral], averageRating: 9, ratingsCount: 10);
        await data.Discovery.CreateUserGenreScoreAsync(user, favorite, score: 100);
        await data.Discovery.CreateUserGenreScoreAsync(user, neutral, score: 1);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal([favoriteMedia.Id, neutralMedia.Id], result.Select(x => x.Id).ToList());
    }

    [Fact]
    public async Task GetRecommendedAsync_IncludesAllMediaTypesWhenTheyMatchTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("type-recommendation-user"));
        await data.SaveAsync();
        var genre = await data.Genres.CreateGenreAsync("Adventure");
        await data.Discovery.CreateMediaWithGenresAsync("Movie", [genre], MediaType.Movie, averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateMediaWithGenresAsync("Book", [genre], MediaType.Book, averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateMediaWithGenresAsync("Series", [genre], MediaType.TvSeries, averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateUserGenreScoreAsync(user, genre, score: 10);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id);

        Assert.Equal(["Book", "Movie", "Series"], result.Select(x => x.Title));
        Assert.Equal(["Book", "Movie", "TvSeries"], result.Select(x => x.Type));
    }

    [Fact]
    public async Task GetRecommendedAsync_RespectsLimitAndIsDeterministicWhenScoresTie()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("tie-recommendation-user"));
        await data.SaveAsync();
        var genre = await data.Genres.CreateGenreAsync("Mystery");
        await data.Discovery.CreateMediaWithGenresAsync("Charlie", [genre], averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateMediaWithGenresAsync("Alpha", [genre], averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateMediaWithGenresAsync("Bravo", [genre], averageRating: 5, ratingsCount: 1);
        await data.Discovery.CreateUserGenreScoreAsync(user, genre, score: 10);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(user.Id, 2);
        var none = await service.GetRecommendedAsync(user.Id, 0);

        Assert.Equal(["Alpha", "Bravo"], result.Select(x => x.Title));
        Assert.Empty(none);
    }

    [Fact]
    public async Task GetRecommendedAsync_DoesNotThrowWhenUserHasNoDataAndNoCandidates()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(Guid.NewGuid());

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetRecommendedAsync_NonexistentUserUsesSparsePopularFallback()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var candidate = await data.Discovery.CreatePopularMediaAsync("Fallback", averageRating: 8, ratingsCount: 3);
        var service = CreateService(db);

        var result = await service.GetRecommendedAsync(Guid.NewGuid());

        var item = Assert.Single(result);
        Assert.Equal(candidate.Id, item.Id);
    }

    [Fact]
    public async Task GetSimilarAsync_ThrowsWhenSourceMediaIsMissing()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetSimilarAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetSimilarAsync_ThrowsWhenSourceMediaIsDeleted()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var source = await data.Media.CreateMovieAsync("Deleted source", isDeleted: true);
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.GetSimilarAsync(source.Id));
    }

    [Fact]
    public async Task GetSimilarAsync_ReturnsEmptyWhenSourceHasNoGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var source = await data.Media.CreateMovieAsync("No genre source");
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSimilarAsync_ExcludesSourceMediaAndDeletedCandidates()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = await data.Genres.CreateGenreAsync("Drama");
        var source = await data.Discovery.CreateMediaWithGenresAsync("Source", [genre], averageRating: 10, ratingsCount: 10);
        var visible = await data.Discovery.CreateMediaWithGenresAsync("Visible similar", [genre], averageRating: 5, ratingsCount: 1);
        var deleted = await data.Discovery.CreateDeletedDiscoverableMediaAsync("Deleted similar", genres: [genre]);
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id);

        Assert.Equal([visible.Id], result.Select(x => x.Id).ToList());
        Assert.DoesNotContain(result, x => x.Id == source.Id);
        Assert.DoesNotContain(result, x => x.Id == deleted.Id);
    }

    [Fact]
    public async Task GetSimilarAsync_PrefersMoreSharedGenresThenAverageRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var mystery = await data.Genres.CreateGenreAsync("Mystery");
        var comedy = await data.Genres.CreateGenreAsync("Comedy");
        var source = await data.Discovery.CreateMediaWithGenresAsync("Source", [drama, mystery]);
        var twoGenreMatch = await data.Discovery.CreateMediaWithGenresAsync("Two genre match", [drama, mystery], averageRating: 3);
        var oneGenreHighRating = await data.Discovery.CreateMediaWithGenresAsync("One genre high rating", [drama, comedy], averageRating: 10);
        var oneGenreLowerRating = await data.Discovery.CreateMediaWithGenresAsync("One genre lower rating", [mystery], averageRating: 5);
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id);

        Assert.Equal(
            [twoGenreMatch.Id, oneGenreHighRating.Id, oneGenreLowerRating.Id],
            result.Select(x => x.Id).ToList());
    }

    [Fact]
    public async Task GetSimilarAsync_IncludesAllMediaTypesThatShareGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = await data.Genres.CreateGenreAsync("Adventure");
        var source = await data.Discovery.CreateMediaWithGenresAsync("Source", [genre], MediaType.Movie);
        await data.Discovery.CreateMediaWithGenresAsync("Book", [genre], MediaType.Book, averageRating: 5);
        await data.Discovery.CreateMediaWithGenresAsync("Movie", [genre], MediaType.Movie, averageRating: 5);
        await data.Discovery.CreateMediaWithGenresAsync("Series", [genre], MediaType.TvSeries, averageRating: 5);
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id);

        Assert.Equal(["Book", "Movie", "Series"], result.Select(x => x.Title));
        Assert.Equal(["Book", "Movie", "TvSeries"], result.Select(x => x.Type));
    }

    [Fact]
    public async Task GetSimilarAsync_RespectsLimitAndUsesDeterministicTitleOrdering()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = await data.Genres.CreateGenreAsync("Noir");
        var source = await data.Discovery.CreateMediaWithGenresAsync("Source", [genre]);
        await data.Discovery.CreateMediaWithGenresAsync("Charlie", [genre], averageRating: 5);
        await data.Discovery.CreateMediaWithGenresAsync("Alpha", [genre], averageRating: 5);
        await data.Discovery.CreateMediaWithGenresAsync("Bravo", [genre], averageRating: 5);
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id, 2);
        var none = await service.GetSimilarAsync(source.Id, -1);

        Assert.Equal(["Alpha", "Bravo"], result.Select(x => x.Title));
        Assert.Empty(none);
    }

    [Fact]
    public async Task GetSimilarAsync_DoesNotReturnDuplicateMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var mystery = await data.Genres.CreateGenreAsync("Mystery");
        var source = await data.Discovery.CreateMediaWithGenresAsync("Source", [drama, mystery]);
        await data.Discovery.CreateMediaWithGenresAsync("Candidate", [drama, mystery]);
        var service = CreateService(db);

        var result = await service.GetSimilarAsync(source.Id);

        Assert.Equal(result.Count, result.Select(x => x.Id).Distinct().Count());
    }

    private static DiscoveryService CreateService(SqliteTestDb db) => new(db.Context);
}
