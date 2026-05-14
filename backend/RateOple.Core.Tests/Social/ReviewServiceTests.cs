using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
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
        Assert.Equal("Media", review.TargetType);
        Assert.Equal(8, review.RatingValue);
        Assert.Equal("Reviewable Movie", review.TargetTitle);
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
        Assert.Equal("Season", review.TargetType);
        Assert.Equal(7, review.RatingValue);
        Assert.Equal(season.Id, review.SeasonId);
        Assert.Equal(1, review.SeasonNumber);
        Assert.Equal("Season 1", review.TargetTitle);
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
        Assert.Equal("Episode", review.TargetType);
        Assert.Equal(9, review.RatingValue);
        Assert.Equal(episode.Id, review.EpisodeId);
        Assert.Equal(1, review.SeasonNumber);
        Assert.Equal(1, review.EpisodeNumber);
        Assert.Equal("Episode 1", review.TargetTitle);
    }

    [Fact]
    public async Task CreateReviewAsync_MediaReviewRecordsInteractionAndRecalculatesTasteAfterInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-signal-user"));
        var media = data.Media.Movie("Review Signal Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        await data.SaveAsync();
        var taste = new SpyUserTasteService();
        var service = CreateService(
            db,
            interactionService: new InteractionService(db.Context, taste),
            userTasteService: taste);

        await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Signal review."
        });

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Equal(InteractionType.ReviewCreated, interaction.InteractionType);
        Assert.Equal(user.Id, interaction.UserId);
        Assert.Equal(media.Id, interaction.MediaId);
        Assert.Null(interaction.SeasonId);
        Assert.Null(interaction.EpisodeId);
        Assert.Equal(8, interaction.Points);
        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task CreateReviewAsync_SeasonReviewRecordsSeasonInteractionAndRecalculatesSeriesTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-review-signal-user"));
        var series = data.Media.TvSeries("Season Review Signal Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var rating = await data.Reviews.CreateSeasonRatingTargetAsync(user, season, 7);
        var taste = new SpyUserTasteService();
        var service = CreateService(
            db,
            interactionService: new InteractionService(db.Context, taste),
            userTasteService: taste);

        await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Season signal review."
        });

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Null(interaction.MediaId);
        Assert.Equal(season.Id, interaction.SeasonId);
        Assert.Null(interaction.EpisodeId);
        Assert.Equal(InteractionType.ReviewCreated, interaction.InteractionType);
        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task CreateReviewAsync_EpisodeReviewRecordsEpisodeInteractionAndRecalculatesSeriesTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-review-signal-user"));
        var series = data.Media.TvSeries("Episode Review Signal Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series);
        var episode = await data.Media.CreateEpisodeAsync(season);
        var rating = await data.Reviews.CreateEpisodeRatingTargetAsync(user, episode, 9);
        var taste = new SpyUserTasteService();
        var service = CreateService(
            db,
            interactionService: new InteractionService(db.Context, taste),
            userTasteService: taste);

        await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Episode signal review."
        });

        var interaction = await db.Context.MediaInteractions.SingleAsync();
        Assert.Null(interaction.MediaId);
        Assert.Null(interaction.SeasonId);
        Assert.Equal(episode.Id, interaction.EpisodeId);
        Assert.Equal(InteractionType.ReviewCreated, interaction.InteractionType);
        Assert.Equal((user.Id, series.Id), Assert.Single(taste.RecalculateMediaContextCalls));
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
    public async Task CreateReviewAsync_MissingRatingDoesNotCreateSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-rating-signal-reviewer"));
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = Guid.NewGuid(),
            Content = "No rating."
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(await db.Context.Reviews.ToListAsync());
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
    public async Task CreateReviewAsync_RatingOwnedByAnotherUserDoesNotCreateSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("rating-signal-owner"));
        var other = data.Users.Add(data.Users.Normal("rating-signal-intruder"));
        var media = data.Media.Movie("Owned Signal Rating Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 8);
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreateReviewAsync(other.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Not mine."
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(await db.Context.Reviews.ToListAsync());
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
    public async Task CreateReviewAsync_RejectsSeasonTargetWithDeletedParentSeriesWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-season-reviewer"));
        await data.SaveAsync();
        var (_, _, rating) = await data.Reviews.CreateSeasonRatingWithDeletedParentAsync(user, data.Media);
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Hidden parent."
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(await db.Context.Reviews.ToListAsync());
    }

    [Fact]
    public async Task CreateReviewAsync_RejectsEpisodeTargetWithDeletedParentSeriesWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-parent-episode-reviewer"));
        await data.SaveAsync();
        var (_, _, _, rating) = await data.Reviews.CreateEpisodeRatingWithDeletedParentAsync(user, data.Media);
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "Hidden parent."
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(await db.Context.Reviews.ToListAsync());
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
    public async Task CreateReviewAsync_DuplicateRatingRecalculatesTasteOnceWithoutNewReviewInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("duplicate-signal-reviewer"));
        var media = data.Media.Movie("Duplicate Signal Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        var existing = data.Reviews.Review(user, media, rating, "First");
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        var updated = await service.CreateReviewAsync(user.Id, new CreateReviewDto
        {
            RatingId = rating.Id,
            Content = "  Second  "
        });

        Assert.Equal(existing.Id, updated.Id);
        Assert.Equal("Second", updated.Content);
        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
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
    public async Task UpdateReviewAsync_ContentOnlyRecalculatesTasteAndDoesNotCreateReviewInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-content-signal-updater"));
        var media = data.Media.Movie("Content Signal Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 5);
        var review = data.Reviews.Review(user, media, rating, "Old");
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await service.UpdateReviewAsync(user.Id, review.Id, new UpdateReviewDto { Content = "New" });

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task UpdateReviewAsync_RatingValueUpdateRecalculatesTasteOnce()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-rating-signal-updater"));
        var media = data.Media.Movie("Rating Signal Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 5);
        var review = data.Reviews.Review(user, media, rating, "Old");
        await data.SaveAsync();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, userTasteService: taste);

        await service.UpdateReviewAsync(user.Id, review.Id, new UpdateReviewDto
        {
            Content = "New",
            UpdatedRatingValue = 9
        });

        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
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
    public async Task UpdateReviewAsync_NonOwnerFailureDoesNotCreateSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("review-signal-owner"));
        var other = data.Users.Add(data.Users.Normal("review-signal-intruder"));
        var media = data.Media.Movie("Protected Signal Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 5);
        var review = data.Reviews.Review(owner, media, rating, "Owned");
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateReviewAsync(other.Id, review.Id, new UpdateReviewDto
        {
            Content = "Nope"
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Equal("Owned", (await db.Context.Reviews.SingleAsync()).Content);
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
    public async Task UpdateReviewAsync_DeletedTargetDoesNotCreateSignalsOrMutateReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-target-signal-updater"));
        var media = data.Media.Movie("Soon Signal Deleted");
        var rating = data.Reviews.RatingForMedia(user, media, 5);
        var review = data.Reviews.Review(user, media, rating, "Old");
        await data.SaveAsync();
        media.IsDeleted = true;
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateReviewAsync(user.Id, review.Id, new UpdateReviewDto
        {
            Content = "Still visible?"
        }));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Equal("Old", (await db.Context.Reviews.SingleAsync()).Content);
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
    public async Task DeleteReviewAsync_KeepingRatingRecalculatesTasteOnceWithoutInteraction()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-delete-signal-user"));
        var media = data.Media.Movie("Delete Signal Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 6);
        var review = data.Reviews.Review(user, media, rating, "Remove review only");
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await service.DeleteReviewAsync(user.Id, review.Id, deleteRating: false);

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
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
    public async Task DeleteReviewAsync_DeleteRatingRecalculatesTasteOnceThroughRatingDeletion()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("review-rating-delete-signal-user"));
        var media = data.Media.Movie("Delete Rating Signal Movie", averageRating: 6, ratingsCount: 1);
        await data.SaveAsync();
        var taste = new SpyUserTasteService();
        var ratingService = CreateRatingService(db, userTasteService: taste);
        var ratingDto = await ratingService.RateMediaAsync(user.Id, media.Id, 6);
        taste.RecalculateMediaContextCalls.Clear();
        var rating = await db.Context.Ratings.SingleAsync(r => r.Id == ratingDto.Id);
        var review = data.Reviews.Review(user, media, rating, "Remove both");
        await data.SaveAsync();
        var service = CreateService(db, ratingService: ratingService, userTasteService: taste);

        await service.DeleteReviewAsync(user.Id, review.Id, deleteRating: true);

        Assert.Equal((user.Id, media.Id), Assert.Single(taste.RecalculateMediaContextCalls));
    }

    [Fact]
    public async Task DeleteReviewAsync_DeletedTargetWithoutDeletingRatingRemovesReviewAndRecalculatesUserTaste()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-target-review-delete-user"));
        var media = data.Media.Movie("Deleted Target Review Delete Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 6);
        var review = data.Reviews.Review(user, media, rating, "Remove after target deleted");
        await data.SaveAsync();
        media.IsDeleted = true;
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await service.DeleteReviewAsync(user.Id, review.Id, deleteRating: false);

        Assert.Empty(await db.Context.Reviews.ToListAsync());
        Assert.Single(await db.Context.Ratings.ToListAsync());
        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Equal(user.Id, Assert.Single(taste.RecalculateUserCalls));
    }

    [Fact]
    public async Task DeleteReviewAsync_DeletedTargetWithDeleteRatingRollsBackWithoutSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-target-review-rating-delete-user"));
        var media = data.Media.Movie("Deleted Target Review Rating Delete Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 6);
        var review = data.Reviews.Review(user, media, rating, "Remove rating after target deleted");
        await data.SaveAsync();
        media.IsDeleted = true;
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => service.DeleteReviewAsync(user.Id, review.Id, deleteRating: true));

        db.Context.ChangeTracker.Clear();
        Assert.Single(await db.Context.Reviews.ToListAsync());
        Assert.Single(await db.Context.Ratings.ToListAsync());
        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Empty(taste.RecalculateUserCalls);
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
    public async Task DeleteReviewAsync_NonOwnerFailureDoesNotCreateSignalsOrMutateReview()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("review-delete-signal-owner"));
        var other = data.Users.Add(data.Users.Normal("review-delete-signal-intruder"));
        var media = data.Media.Movie("Protected Delete Signal Movie");
        var rating = data.Reviews.RatingForMedia(owner, media, 5);
        var review = data.Reviews.Review(owner, media, rating, "Owned");
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteReviewAsync(other.Id, review.Id, false));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
        Assert.Single(await db.Context.Reviews.ToListAsync());
    }

    [Fact]
    public async Task DeleteReviewAsync_MissingReviewDoesNotCreateSignals()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("missing-delete-signal-user"));
        await data.SaveAsync();
        var interaction = new SpyInteractionService();
        var taste = new SpyUserTasteService();
        var service = CreateService(db, interactionService: interaction, userTasteService: taste);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.DeleteReviewAsync(user.Id, Guid.NewGuid(), false));

        Assert.Empty(interaction.ReviewCreatedCalls);
        Assert.Empty(taste.RecalculateMediaContextCalls);
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
    public async Task GetMediaReviewsAsync_DeletedUserRendersDeletedUserDisplay()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("deleted-reviewer"));
        user.IsDeleted = true;
        data.Users.Profile(user, "Old Display");
        var media = data.Media.Movie("Deleted User Review Movie");
        var rating = data.Reviews.RatingForMedia(user, media, 8);
        data.Reviews.Review(user, media, rating, "Still public");
        await data.SaveAsync();
        var service = CreateService(db);

        var review = Assert.Single(await service.GetMediaReviewsAsync(media.Id));

        Assert.Equal("Deleted user", review.UserDisplayName);
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

    [Fact]
    public async Task GetMediaReviewsAsync_WithMediaTargetOnlyExcludesSeasonAndEpisodeReviews()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var mediaUser = data.Users.Add(data.Users.Normal("media-target-reviewer"));
        var seasonUser = data.Users.Add(data.Users.Normal("season-target-reviewer"));
        var episodeUser = data.Users.Add(data.Users.Normal("episode-target-reviewer"));
        var series = data.Media.TvSeries("Target Filter Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, 2);
        var episode = await data.Media.CreateEpisodeAsync(season, 3, "Target Episode");
        var mediaRating = data.Reviews.RatingForMedia(mediaUser, series, 8);
        var seasonRating = data.Reviews.RatingForSeason(seasonUser, season, 7);
        var episodeRating = data.Reviews.RatingForEpisode(episodeUser, episode, 9);
        var mediaReview = data.Reviews.Review(mediaUser, series, mediaRating, "Series review");
        data.Reviews.Review(seasonUser, series, seasonRating, "Season review");
        data.Reviews.Review(episodeUser, series, episodeRating, "Episode review");
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetMediaReviewsAsync(series.Id, ReviewTargetFilter.Media);

        var review = Assert.Single(reviews);
        Assert.Equal(mediaReview.Id, review.Id);
        Assert.Equal("Media", review.TargetType);
        Assert.Equal(8, review.RatingValue);
        Assert.Equal("Target Filter Series", review.TargetTitle);
    }

    [Fact]
    public async Task GetMediaReviewsAsync_WithAllTargetIncludesMediaSeasonAndEpisodeReviewsWithLabels()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var mediaUser = data.Users.Add(data.Users.Normal("all-media-reviewer"));
        var seasonUser = data.Users.Add(data.Users.Normal("all-season-reviewer"));
        var episodeUser = data.Users.Add(data.Users.Normal("all-episode-reviewer"));
        var series = data.Media.TvSeries("All Target Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, 4);
        var episode = await data.Media.CreateEpisodeAsync(season, 5, "Finale");
        var mediaRating = data.Reviews.RatingForMedia(mediaUser, series, 6);
        var seasonRating = data.Reviews.RatingForSeason(seasonUser, season, 7);
        var episodeRating = data.Reviews.RatingForEpisode(episodeUser, episode, 9);
        data.Reviews.Review(mediaUser, series, mediaRating, "Series review");
        data.Reviews.Review(seasonUser, series, seasonRating, "Season review");
        data.Reviews.Review(episodeUser, series, episodeRating, "Episode review");
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetMediaReviewsAsync(series.Id, ReviewTargetFilter.All);

        Assert.Equal(3, reviews.Count);
        Assert.Contains(reviews, r =>
            r.TargetType == "Media" &&
            r.RatingValue == 6 &&
            r.TargetTitle == "All Target Series");
        Assert.Contains(reviews, r =>
            r.TargetType == "Season" &&
            r.SeasonId == season.Id &&
            r.SeasonNumber == 4 &&
            r.RatingValue == 7 &&
            r.TargetTitle == "Season 4");
        Assert.Contains(reviews, r =>
            r.TargetType == "Episode" &&
            r.EpisodeId == episode.Id &&
            r.SeasonNumber == 4 &&
            r.EpisodeNumber == 5 &&
            r.RatingValue == 9 &&
            r.TargetTitle == "Finale");
    }

    [Fact]
    public async Task GetSeasonReviewsAsync_ReturnsOnlySeasonTargetReviews()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("season-feed-reviewer"));
        var series = data.Media.TvSeries("Season Feed Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, 3);
        var episode = await data.Media.CreateEpisodeAsync(season, 1, "Episode One");
        var seasonRating = data.Reviews.RatingForSeason(user, season, 7);
        var episodeRating = data.Reviews.RatingForEpisode(user, episode, 9);
        var seasonReview = data.Reviews.Review(user, series, seasonRating, "Season-only review");
        data.Reviews.Review(user, series, episodeRating, "Episode-only review");
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetSeasonReviewsAsync(season.Id);

        var review = Assert.Single(reviews);
        Assert.Equal(seasonReview.Id, review.Id);
        Assert.Equal("Season", review.TargetType);
        Assert.Equal(season.Id, review.SeasonId);
        Assert.Equal(3, review.SeasonNumber);
        Assert.Equal(7, review.RatingValue);
        Assert.Equal("Season 3", review.TargetTitle);
    }

    [Fact]
    public async Task GetEpisodeReviewsAsync_ReturnsOnlyEpisodeTargetReviews()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("episode-feed-reviewer"));
        var series = data.Media.TvSeries("Episode Feed Series");
        await data.SaveAsync();
        var season = await data.Media.CreateSeasonAsync(series, 5);
        var episode = await data.Media.CreateEpisodeAsync(season, 6, "The Episode Target");
        var seasonRating = data.Reviews.RatingForSeason(user, season, 7);
        var episodeRating = data.Reviews.RatingForEpisode(user, episode, 9);
        data.Reviews.Review(user, series, seasonRating, "Season-only review");
        var episodeReview = data.Reviews.Review(user, series, episodeRating, "Episode-only review");
        await data.SaveAsync();
        var service = CreateService(db);

        var reviews = await service.GetEpisodeReviewsAsync(episode.Id);

        var review = Assert.Single(reviews);
        Assert.Equal(episodeReview.Id, review.Id);
        Assert.Equal("Episode", review.TargetType);
        Assert.Equal(episode.Id, review.EpisodeId);
        Assert.Equal(5, review.SeasonNumber);
        Assert.Equal(6, review.EpisodeNumber);
        Assert.Equal(9, review.RatingValue);
        Assert.Equal("The Episode Target", review.TargetTitle);
    }

    private static ReviewService CreateService(
        SqliteTestDb db,
        IRatingService? ratingService = null,
        IInteractionService? interactionService = null,
        IUserTasteService? userTasteService = null) => new(
            db.Context,
            ratingService ?? CreateRatingService(db, userTasteService: userTasteService),
            interactionService ?? new NoopInteractionService(),
            userTasteService ?? new NoopUserTasteService());

    private static RatingService CreateRatingService(
        SqliteTestDb db,
        IInteractionService? interactionService = null,
        IUserTasteService? userTasteService = null) => new(
            db.Context,
            interactionService ?? new NoopInteractionService(),
            userTasteService ?? new NoopUserTasteService());
}
