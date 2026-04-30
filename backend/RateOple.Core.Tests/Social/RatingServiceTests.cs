using RateOple.Constants.Enums;
using RateOple.Core.Social.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.Social;

public class RatingServiceTests
{
    [Fact]
    public async Task RateMediaAsync_CreatesRatingAndRefreshesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        var rating = await service.RateMediaAsync(userId, mediaId, 8);

        Assert.Equal(8, rating.Value);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(1, media!.RatingsCount);
        Assert.Equal(8, media.AverageRating);
    }

    [Fact]
    public async Task RateMediaAsync_UpdatesExistingRatingAndAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await service.RateMediaAsync(userId, mediaId, 4);
        var updated = await service.RateMediaAsync(userId, mediaId, 9);

        Assert.Equal(9, updated.Value);
        Assert.Single(db.Context.Ratings);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(1, media!.RatingsCount);
        Assert.Equal(9, media.AverageRating);
    }

    [Fact]
    public async Task DeleteMediaRatingAsync_RemovesRatingAndRefreshesAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await service.RateMediaAsync(userId, mediaId, 6);
        await service.DeleteMediaRatingAsync(userId, mediaId);

        Assert.Empty(db.Context.Ratings);

        var media = await db.Context.Media.FindAsync(mediaId);
        Assert.NotNull(media);
        Assert.Equal(0, media!.RatingsCount);
        Assert.Equal(0, media.AverageRating);
    }

    [Fact]
    public async Task RateMediaAsync_RejectsInvalidRatingValue()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (userId, mediaId) = await SeedUserAndMediaAsync(db);
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => service.RateMediaAsync(userId, mediaId, 11));
    }

    private static RatingService CreateService(SqliteTestDb db)
    {
        return new RatingService(
            db.Context,
            new NoopInteractionService(),
            new NoopUserTasteService());
    }

    private static async Task<(Guid UserId, Guid MediaId)> SeedUserAndMediaAsync(SqliteTestDb db)
    {
        var userId = Guid.NewGuid();
        var mediaId = Guid.NewGuid();

        db.Context.Users.Add(new User
        {
            Id = userId,
            UserName = "rating-user",
            Email = "rating-user@example.com"
        });
        db.Context.Media.Add(new MediaEntity
        {
            Id = mediaId,
            Type = MediaType.Movie,
            Title = "Test Movie",
            CreatedAt = DateTime.UtcNow
        });
        await db.Context.SaveChangesAsync();

        return (userId, mediaId);
    }
}
