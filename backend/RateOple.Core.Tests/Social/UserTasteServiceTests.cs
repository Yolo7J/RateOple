using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.Social;

public class UserTasteServiceTests
{
    [Fact]
    public async Task RecalculateForUserAsync_CreatesScoresFromRatedMediaGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("taste-user"));
        var drama = await data.Media.CreateGenreAsync("Taste Drama");
        var mystery = await data.Media.CreateGenreAsync("Taste Mystery");
        await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { drama, mystery }, ratingValue: 8);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Equal(2, scores.Count);
        Assert.Equal(4, scores[drama.Id]);
        Assert.Equal(4, scores[mystery.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_UpdatesScoresWhenRatingChanges()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("rating-update-user"));
        var genre = await data.Media.CreateGenreAsync("Rating Update Genre");
        var (_, rating) = await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { genre }, ratingValue: 4);
        var service = new UserTasteService(db.Context);
        await service.RecalculateForUserAsync(user.Id);

        rating.Value = 9;
        rating.UpdatedAt = DateTime.UtcNow.AddMinutes(1);
        await data.SaveAsync();
        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Single(scores);
        Assert.Equal(9, scores[genre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_RemovesScoreWhenRatingIsDeleted()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("rating-delete-user"));
        var genre = await data.Media.CreateGenreAsync("Rating Delete Genre");
        var (_, rating) = await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { genre }, ratingValue: 8);
        var service = new UserTasteService(db.Context);
        await service.RecalculateForUserAsync(user.Id);

        db.Context.Ratings.Remove(rating);
        await data.SaveAsync();
        await service.RecalculateForUserAsync(user.Id);

        Assert.Empty(await LoadScoresAsync(db, user));
    }

    [Fact]
    public async Task RecalculateForUserAsync_AggregatesMultipleRatingsDeterministically()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("aggregate-user"));
        var shared = await data.Media.CreateGenreAsync("Shared Taste Genre");
        await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { shared }, title: "First Shared", ratingValue: 7);
        await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { shared }, title: "Second Shared", ratingValue: 9);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);
        await service.RecalculateForUserAsync(user.Id);

        var scoreRows = await db.Context.UserGenreScores
            .Where(x => x.UserId == user.Id)
            .ToListAsync();
        Assert.Single(scoreRows);
        Assert.Equal(16, scoreRows[0].Score);
    }

    [Fact]
    public async Task RecalculateForUserAsync_LowRatingsContributeLessThanHighRatings()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("low-rating-user"));
        var lowGenre = await data.Media.CreateGenreAsync("Low Rating Genre");
        var highGenre = await data.Media.CreateGenreAsync("High Rating Genre");
        await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { lowGenre }, title: "Low Rated", ratingValue: 2);
        await data.Discovery.CreateRatedMediaWithGenresAsync(user, new[] { highGenre }, title: "High Rated", ratingValue: 9);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Equal(2, scores[lowGenre.Id]);
        Assert.Equal(9, scores[highGenre.Id]);
        Assert.True(scores[lowGenre.Id] < scores[highGenre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_UnratedMediaDoesNotContribute()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("unrated-user"));
        var genre = await data.Media.CreateGenreAsync("Unrated Genre");
        await data.Media.CreateMovieAsync("Unrated Movie", genres: new[] { genre });
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        Assert.Empty(await LoadScoresAsync(db, user));
    }

    [Fact]
    public async Task RecalculateForUserAsync_DeletedMediaDoesNotContributeAndRemovesStaleScores()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-taste-user"));
        var deletedGenre = await data.Media.CreateGenreAsync("Deleted Taste Genre");
        await data.Discovery.CreateDeletedRatedMediaWithGenresAsync(user, new[] { deletedGenre }, ratingValue: 10);
        await data.Discovery.CreateUserGenreScoreAsync(user, deletedGenre, score: 99);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        Assert.Empty(await LoadScoresAsync(db, user));
    }

    [Fact]
    public async Task RecalculateForUserAsync_ReviewAndInteractionSignalsContributeToTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-interaction-user"));
        var genre = await data.Media.CreateGenreAsync("Review Interaction Genre");
        var media = await data.Media.CreateMovieAsync("Reviewed and Opened", genres: new[] { genre });
        var rating = await data.Reviews.CreateRatingAsync(user, media, 1);
        await data.Reviews.CreateReviewAsync(user, media, rating);
        await data.Interactions.CreateMediaInteractionAsync(user, media, points: 3);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Equal(10, scores[genre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_SeasonRatingContributesToSeriesGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-taste-user"));
        var genre = await data.Media.CreateGenreAsync("Season Genre");
        await data.Discovery.CreateRatedSeasonWithSeriesGenresAsync(user, new[] { genre }, ratingValue: 8);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Single(scores);
        Assert.Equal(8, scores[genre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_EpisodeRatingContributesToSeriesGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-taste-user"));
        var genre = await data.Media.CreateGenreAsync("Episode Genre");
        await data.Discovery.CreateRatedEpisodeWithSeriesGenresAsync(user, new[] { genre }, ratingValue: 7);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        var scores = await LoadScoresAsync(db, user);
        Assert.Single(scores);
        Assert.Equal(7, scores[genre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_DeletedTvTargetsDoNotContribute()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-tv-target-user"));
        var deletedSeasonGenre = await data.Media.CreateGenreAsync("Deleted Season Genre");
        var deletedEpisodeGenre = await data.Media.CreateGenreAsync("Deleted Episode Genre");
        var deletedParentGenre = await data.Media.CreateGenreAsync("Deleted Parent Genre");
        await data.Discovery.CreateRatedSeasonWithSeriesGenresAsync(
            user,
            new[] { deletedSeasonGenre },
            title: "Deleted Season Source",
            ratingValue: 8,
            isSeasonDeleted: true);
        await data.Discovery.CreateRatedEpisodeWithSeriesGenresAsync(
            user,
            new[] { deletedEpisodeGenre },
            title: "Deleted Episode Source",
            ratingValue: 8,
            isEpisodeDeleted: true);
        await data.Discovery.CreateRatedEpisodeWithSeriesGenresAsync(
            user,
            new[] { deletedParentGenre },
            title: "Deleted Parent Source",
            ratingValue: 8,
            isSeriesDeleted: true);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(user.Id);

        Assert.Empty(await LoadScoresAsync(db, user));
    }

    [Fact]
    public async Task RecalculateForUserAsync_IsScopedToOneUser()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var targetUser = data.Users.Add(data.Users.Normal("target-taste-user"));
        var otherUser = data.Users.Add(data.Users.Normal("other-taste-user"));
        var targetGenre = await data.Media.CreateGenreAsync("Target Genre");
        var otherGenre = await data.Media.CreateGenreAsync("Other Genre");
        await data.Discovery.CreateRatedMediaWithGenresAsync(targetUser, new[] { targetGenre }, ratingValue: 8);
        await data.Discovery.CreateRatedMediaWithGenresAsync(otherUser, new[] { otherGenre }, ratingValue: 9);
        await data.Discovery.CreateUserGenreScoreAsync(otherUser, otherGenre, score: 1);
        var service = new UserTasteService(db.Context);

        await service.RecalculateForUserAsync(targetUser.Id);

        var targetScores = await LoadScoresAsync(db, targetUser);
        var otherScores = await LoadScoresAsync(db, otherUser);
        Assert.Single(targetScores);
        Assert.Equal(8, targetScores[targetGenre.Id]);
        Assert.Single(otherScores);
        Assert.Equal(1, otherScores[otherGenre.Id]);
    }

    [Fact]
    public async Task RecalculateForUserAsync_RejectsMissingUser()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var service = new UserTasteService(db.Context);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RecalculateForUserAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task RecalculateForMediaContextAsync_RejectsDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("context-deleted-user"));
        var media = await data.Media.CreateMovieAsync("Deleted Context Movie", isDeleted: true);
        var service = new UserTasteService(db.Context);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.RecalculateForMediaContextAsync(user.Id, media.Id));
    }

    private static async Task<Dictionary<int, double>> LoadScoresAsync(SqliteTestDb db, User user) =>
        await db.Context.UserGenreScores
            .AsNoTracking()
            .Where(x => x.UserId == user.Id)
            .OrderBy(x => x.GenreId)
            .ToDictionaryAsync(x => x.GenreId, x => x.Score);
}
