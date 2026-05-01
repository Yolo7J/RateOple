using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Social.DTOs;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Social;

public class ReviewServiceTransactionTests
{
    [Fact]
    public async Task CreateReviewAsync_WhenReviewCreatedInteractionThrows_RollsBackReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db);
        var interaction = new ThrowingInteractionService();
        var service = CreateService(db, interactionService: interaction);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateReviewAsync(userId, new CreateReviewDto
        {
            RatingId = ratingId,
            Content = "Rollback review."
        }));

        Assert.Equal(ThrowingInteractionService.ReviewCreatedFailureMessage, ex.Message);
        Assert.Equal(1, interaction.ReviewCreatedCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Reviews.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
        Assert.Equal(8, await db.Context.Ratings.Where(r => r.Id == ratingId).Select(r => r.Value).SingleAsync());
        Assert.Equal(0, await db.Context.Media.Where(m => m.Id == mediaId).Select(m => m.RatingsCount).SingleAsync());
    }

    [Fact]
    public async Task CreateReviewAsync_WhenInteractionTasteRecalculationThrows_RollsBackReviewAndInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, _, ratingId) = await SeedReviewTargetAsync(db);
        var taste = new ThrowingUserTasteService();
        var service = CreateService(
            db,
            interactionService: new InteractionService(db.Context, taste),
            userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateReviewAsync(userId, new CreateReviewDto
        {
            RatingId = ratingId,
            Content = "Rollback after interaction."
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        Assert.Equal(1, taste.RecalculateMediaContextCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.Reviews.ToListAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task CreateReviewAsync_WhenDuplicateUpsertTasteRecalculationThrows_RollsBackContentUpdate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db);
        var data = new TestDataFactory(db.Context);
        var user = await db.Context.Users.SingleAsync(u => u.Id == userId);
        var media = await db.Context.Media.SingleAsync(m => m.Id == mediaId);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingId);
        var review = data.Reviews.Review(user, media, rating, "Original content");
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateReviewAsync(userId, new CreateReviewDto
        {
            RatingId = ratingId,
            Content = "Changed content"
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        Assert.Equal(1, taste.RecalculateMediaContextCalls);
        db.Context.ChangeTracker.Clear();
        Assert.Equal("Original content", await db.Context.Reviews.Where(r => r.Id == review.Id).Select(r => r.Content).SingleAsync());
        Assert.Empty(await db.Context.MediaInteractions.ToListAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task UpdateReviewAsync_WhenTasteRecalculationThrows_RollsBackContentUpdate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db);
        var data = new TestDataFactory(db.Context);
        var user = await db.Context.Users.SingleAsync(u => u.Id == userId);
        var media = await db.Context.Media.SingleAsync(m => m.Id == mediaId);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingId);
        var review = data.Reviews.Review(user, media, rating, "Original update content");
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateReviewAsync(userId, review.Id, new UpdateReviewDto
        {
            Content = "Changed update content"
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Equal("Original update content", await db.Context.Reviews.Where(r => r.Id == review.Id).Select(r => r.Content).SingleAsync());
        Assert.Equal(8, await db.Context.Ratings.Where(r => r.Id == ratingId).Select(r => r.Value).SingleAsync());
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task UpdateReviewAsync_WhenRatingTasteRecalculationThrows_RollsBackReviewRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db, mediaAverageRating: 8, mediaRatingsCount: 1);
        var data = new TestDataFactory(db.Context);
        var user = await db.Context.Users.SingleAsync(u => u.Id == userId);
        var media = await db.Context.Media.SingleAsync(m => m.Id == mediaId);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingId);
        var review = data.Reviews.Review(user, media, rating, "Original rating content");
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var ratingService = new RatingService(db.Context, new NoopInteractionService(), taste);
        var service = CreateService(db, ratingService: ratingService, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateReviewAsync(userId, review.Id, new UpdateReviewDto
        {
            Content = "Changed rating content",
            UpdatedRatingValue = 4
        }));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Equal("Original rating content", await db.Context.Reviews.Where(r => r.Id == review.Id).Select(r => r.Content).SingleAsync());
        Assert.Equal(8, await db.Context.Ratings.Where(r => r.Id == ratingId).Select(r => r.Value).SingleAsync());
        var aggregate = await db.Context.Media.Where(m => m.Id == mediaId).Select(m => new { m.AverageRating, m.RatingsCount }).SingleAsync();
        Assert.Equal(8, aggregate.AverageRating);
        Assert.Equal(1, aggregate.RatingsCount);
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task DeleteReviewAsync_WhenTasteRecalculationThrows_RollsBackReviewDelete()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db, mediaAverageRating: 8, mediaRatingsCount: 1);
        var data = new TestDataFactory(db.Context);
        var user = await db.Context.Users.SingleAsync(u => u.Id == userId);
        var media = await db.Context.Media.SingleAsync(m => m.Id == mediaId);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingId);
        var review = data.Reviews.Review(user, media, rating, "Delete rollback content");
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DeleteReviewAsync(userId, review.Id, deleteRating: false));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.NotNull(await db.Context.Reviews.FindAsync(review.Id));
        Assert.NotNull(await db.Context.Ratings.FindAsync(ratingId));
        var aggregate = await db.Context.Media.Where(m => m.Id == mediaId).Select(m => new { m.AverageRating, m.RatingsCount }).SingleAsync();
        Assert.Equal(8, aggregate.AverageRating);
        Assert.Equal(1, aggregate.RatingsCount);
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    [Fact]
    public async Task DeleteReviewAsync_WhenRatingDeleteTasteRecalculationThrows_RollsBackReviewRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId, ratingId) = await SeedReviewTargetAsync(db, mediaAverageRating: 8, mediaRatingsCount: 1);
        var data = new TestDataFactory(db.Context);
        var user = await db.Context.Users.SingleAsync(u => u.Id == userId);
        var media = await db.Context.Media.SingleAsync(m => m.Id == mediaId);
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingId);
        var review = data.Reviews.Review(user, media, rating, "Delete rating rollback content");
        await data.SaveAsync();
        var taste = new ThrowingUserTasteService();
        var ratingService = new RatingService(db.Context, new NoopInteractionService(), taste);
        var service = CreateService(db, ratingService: ratingService, userTasteService: taste);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.DeleteReviewAsync(userId, review.Id, deleteRating: true));

        Assert.Equal(ThrowingUserTasteService.RecalculateMediaContextFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.NotNull(await db.Context.Reviews.FindAsync(review.Id));
        Assert.NotNull(await db.Context.Ratings.FindAsync(ratingId));
        var aggregate = await db.Context.Media.Where(m => m.Id == mediaId).Select(m => new { m.AverageRating, m.RatingsCount }).SingleAsync();
        Assert.Equal(8, aggregate.AverageRating);
        Assert.Equal(1, aggregate.RatingsCount);
        Assert.Empty(await db.Context.UserGenreScores.ToListAsync());
    }

    private static async Task<(Guid UserId, Guid MediaId, Guid RatingId)> SeedReviewTargetAsync(
        SqliteTestDb db,
        double mediaAverageRating = 0,
        int mediaRatingsCount = 0)
    {
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-transaction-user"));
        var media = data.Media.Movie("Review Transaction Movie", averageRating: mediaAverageRating, ratingsCount: mediaRatingsCount);
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        await data.SaveAsync();
        return (user.Id, media.Id, rating.Id);
    }

    private static ReviewService CreateService(
        SqliteTestDb db,
        IRatingService? ratingService = null,
        IInteractionService? interactionService = null,
        IUserTasteService? userTasteService = null) => new(
            db.Context,
            ratingService ?? new RatingService(db.Context, new NoopInteractionService(), userTasteService ?? new NoopUserTasteService()),
            interactionService ?? new NoopInteractionService(),
            userTasteService ?? new NoopUserTasteService());
}
