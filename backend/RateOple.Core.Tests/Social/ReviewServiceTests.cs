using Microsoft.EntityFrameworkCore;
using RateOple.Core.Social.DTOs;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.Social;

public class ReviewServiceTests
{
    [Fact]
    public async Task CreateReviewAsync_CreatesReviewForOwnMediaRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-owner"));
        var media = data.Media.Movie("Reviewable Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        await data.SaveAsync();
        var service = CreateService(db);

        var review = await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "  Strong review.  "
        });

        Assert.Equal(user.Id, review.UserId);
        Assert.Equal(media.Id, review.MediaId);
        Assert.Equal(rating.Id, review.RatingId);
        Assert.Equal("Strong review.", review.Content);
        Assert.Single(await db.Context.Reviews.ToListAsync());
    }

    [Fact]
    public async Task CreateReviewAsync_CreatesReviewForOwnSeasonRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-reviewer"));
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var rating = await data.Reviews.CreateSeasonRatingTargetAsync(user, season, 7);
        var service = CreateService(db);

        var review = await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Great season."
        });

        Assert.Equal(series.Id, review.MediaId);
        Assert.Equal(rating.Id, review.RatingId);
    }

    [Fact]
    public async Task CreateReviewAsync_CreatesReviewForOwnEpisodeRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-reviewer"));
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1);
        var rating = await data.Reviews.CreateEpisodeRatingTargetAsync(user, episode, 9);
        var service = CreateService(db);

        var review = await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Best episode."
        });

        Assert.Equal(series.Id, review.MediaId);
        Assert.Equal(rating.Id, review.RatingId);
    }

    [Fact]
    public async Task CreateReviewAsync_RequiresExistingRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-rating-reviewer"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = Guid.NewGuid(),
            Content = "No rating."
        }));
    }

    [Fact]
    public async Task CreateReviewAsync_RejectsRatingOwnedByAnotherUser()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("rating-owner"));
        var other = data.Users.Add(data.Users.Normal("other-reviewer"));
        var media = data.Media.Movie("Owned Rating Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 8);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreateReviewAsync(other.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Not mine."
        }));
    }

    [Fact]
    public async Task CreateReviewAsync_RejectsDeletedMediaTarget()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-media-reviewer"));
        await data.SaveAsync();
        var (_, rating) = await data.Reviews.CreateDeletedMediaWithRatingTargetAsync(user, data.Media);
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Hidden target."
        }));
    }

    [Fact]
    public async Task CreateReviewAsync_RejectsDeletedSeasonTarget()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-season-reviewer"));
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1, isDeleted: true);
        var rating = await data.Reviews.CreateSeasonRatingTargetAsync(user, season);
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Hidden season."
        }));
    }

    [Fact]
    public async Task CreateReviewAsync_RejectsDeletedEpisodeTarget()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-episode-reviewer"));
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1, isDeleted: true);
        var rating = await data.Reviews.CreateEpisodeRatingTargetAsync(user, episode);
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Hidden episode."
        }));
    }

    [Fact]
    public async Task CreateReviewAsync_DuplicateRatingUpdatesExistingReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("duplicate-reviewer"));
        var media = data.Media.Movie("Duplicate Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        await data.SaveAsync();
        var service = CreateService(db);

        var created = await service.CreateReviewAsync(user.Id, new CreateReviewDto { RatingId = rating.Id, Content = "First" });
        var updated = await service.CreateReviewAsync(user.Id, new CreateReviewDto { RatingId = rating.Id, Content = "Second" });

        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("Second", updated.Content);
        Assert.Single(await db.Context.Reviews.ToListAsync());
    }

    [Fact]
    public async Task UpdateReviewAsync_OwnerCanUpdateReviewAndRatingValue()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-updater"));
        var media = data.Media.Movie("Updated Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 5);
        var review = data.Reviews.Review(user, media, rating, "Old");
        await data.SaveAsync();
        var service = CreateService(db);

        var updated = await service.UpdateReviewAsync(user.Id, review.Id, new UpdateReviewDto
        {
            Content = "New",
            UpdatedRatingValue = 9
        });

        Assert.Equal("New", updated.Content);
        Assert.Equal(user.Id, updated.UserId);
        var storedRating = await db.Context.Ratings.SingleAsync(r => r.Id == rating.Id);
        Assert.Equal(9, storedRating.Value);
    }

    [Fact]
    public async Task UpdateReviewAsync_NonOwnerCannotUpdateReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("review-owner"));
        var other = data.Users.Add(data.Users.Normal("review-intruder"));
        var media = data.Media.Movie("Protected Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 5);
        var review = data.Reviews.Review(owner, media, rating, "Owned");
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateReviewAsync(other.Id, review.Id, new UpdateReviewDto
        {
            Content = "Nope"
        }));
    }

    [Fact]
    public async Task UpdateReviewAsync_DeletedTargetIsRejected()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-target-updater"));
        var media = data.Media.Movie("Soon Deleted");
        var rating = data.Reviews.RatingForMedia(user, media, 5);
        var review = data.Reviews.Review(user, media, rating, "Old");
        await data.SaveAsync();
        media.IsDeleted = true;
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateReviewAsync(user.Id, review.Id, new UpdateReviewDto
        {
            Content = "Still visible?"
        }));
    }

    [Fact]
    public async Task DeleteReviewAsync_OwnerCanDeleteReviewWithoutDeletingRating()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-deleter"));
        var media = data.Media.Movie("Delete Review Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 6);
        var review = data.Reviews.Review(user, media, rating, "Remove review only");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.DeleteReviewAsync(user.Id, review.Id, deleteRating: false);

        Assert.Empty(await db.Context.Reviews.ToListAsync());
        Assert.Single(await db.Context.Ratings.ToListAsync());
    }

    [Fact]
    public async Task DeleteReviewAsync_DeleteRatingRemovesRatingAndRefreshesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-rating-deleter"));
        var media = data.Media.Movie("Aggregate Movie", averageRating: 6, ratingsCount: 1);
        await data.SaveAsync();
        var ratingService = CreateRatingService(db);
        var ratingDto = await ratingService.RateMediaAsync(user.Id, media.Id, 6);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingDto.Id);
        var review = data.Reviews.Review(user, media, rating, "Remove both");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.DeleteReviewAsync(user.Id, review.Id, deleteRating: true);

        Assert.Empty(await db.Context.Reviews.ToListAsync());
        Assert.Empty(await db.Context.Ratings.ToListAsync());
        var storedMedia = await db.Context.Media.SingleAsync(m => m.Id == media.Id);
        Assert.Equal(0, storedMedia.RatingsCount);
        Assert.Equal(0, storedMedia.AverageRating);
    }

    [Fact]
    public async Task DeleteReviewAsync_NonOwnerCannotDeleteReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("review-owner"));
        var other = data.Users.Add(data.Users.Normal("review-delete-intruder"));
        var media = data.Media.Movie("Protected Delete Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 5);
        var review = data.Reviews.Review(owner, media, rating, "Owned");
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteReviewAsync(other.Id, review.Id, false));
    }

    [Fact]
    public async Task GetMediaReviewsAsync_ReturnsReviewsForActiveMediaInDeterministicOrder()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var firstUser = data.Users.Add(data.Users.Normal("first-reviewer"));
        var secondUser = data.Users.Add(data.Users.Normal("second-reviewer"));
        data.Users.Profile(secondUser, "Second Display");
        var media = data.Media.Movie("Reviewed Movie");
        var firstRating = data.Reviews.RatingForMedia(firstUser, media, 6);
        var secondRating = data.Reviews.RatingForMedia(secondUser, media, 9);
        var older = data.Reviews.Review(firstUser, media, firstRating, "Older");
        older.UpdatedAt = DateTime.UtcNow.AddMinutes(-10);
        var newer = data.Reviews.Review(secondUser, media, secondRating, "Newer");
        newer.UpdatedAt = DateTime.UtcNow.AddMinutes(-1);
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetMediaReviewsAsync(media.Id);

        Assert.Collection(
            reviews,
            item =>
            {
                Assert.Equal(newer.Id, item.Id);
                Assert.Equal("Second Display", item.UserDisplayName);
            },
            item => Assert.Equal(older.Id, item.Id));
    }

    [Fact]
    public async Task GetMediaReviewsAsync_DeletedMediaReturnsEmptyList()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("hidden-reviewer"));
        var media = data.Media.Movie("Hidden Reviewed Movie", isDeleted: true);
        var rating = data.Reviews.RatingForMedia(user, media, 7);
        data.Reviews.Review(user, media, rating, "Should be hidden");
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetMediaReviewsAsync(media.Id);

        Assert.Empty(reviews);
    }

    private static ReviewService CreateService(SqliteTestDb db) => new(
        db.Context,
        CreateRatingService(db),
        new NoopInteractionService(),
        new NoopUserTasteService());

    private static RatingService CreateRatingService(SqliteTestDb db) => new(
        db.Context,
        new NoopInteractionService(),
        new NoopUserTasteService());
}
