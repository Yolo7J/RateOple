using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestReviews
{
    private readonly ApplicationDbContext _context;

    public TestReviews(ApplicationDbContext context)
    {
        _context = context;
    }

    public Rating RatingForMedia(User user, MediaEntity media, int value = 8)
    {
        var rating = BaseRating(user, value);
        rating.MediaId = media.Id;
        _context.Ratings.Add(rating);
        return rating;
    }

    public Rating RatingForSeason(User user, Season season, int value = 8)
    {
        var rating = BaseRating(user, value);
        rating.SeasonId = season.Id;
        _context.Ratings.Add(rating);
        return rating;
    }

    public Rating RatingForEpisode(User user, Episode episode, int value = 8)
    {
        var rating = BaseRating(user, value);
        rating.EpisodeId = episode.Id;
        _context.Ratings.Add(rating);
        return rating;
    }

    public async Task<Rating> CreateRatingAsync(User user, MediaEntity media, int value = 8)
    {
        var rating = RatingForMedia(user, media, value);
        await _context.SaveChangesAsync();
        return rating;
    }

    public async Task<Rating> CreateSeasonRatingTargetAsync(User user, Season season, int value = 8)
    {
        var rating = RatingForSeason(user, season, value);
        await _context.SaveChangesAsync();
        return rating;
    }

    public async Task<Rating> CreateEpisodeRatingTargetAsync(User user, Episode episode, int value = 8)
    {
        var rating = RatingForEpisode(user, episode, value);
        await _context.SaveChangesAsync();
        return rating;
    }

    public Review Review(User user, MediaEntity media, Rating rating, string content = "Existing review")
    {
        var review = new Review
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            MediaId = media.Id,
            RatingId = rating.Id,
            Content = content,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Reviews.Add(review);
        return review;
    }

    public async Task<Review> CreateReviewAsync(
        User user,
        MediaEntity media,
        Rating rating,
        string content = "Existing review")
    {
        var review = Review(user, media, rating, content);
        await _context.SaveChangesAsync();
        return review;
    }

    public async Task<(MediaEntity Media, Rating Rating)> CreateDeletedMediaWithRatingTargetAsync(
        User user,
        TestMedia mediaFactory,
        string title = "Deleted rated movie",
        int value = 8)
    {
        var media = await mediaFactory.CreateMovieAsync(title, isDeleted: true);
        var rating = await CreateRatingAsync(user, media, value);
        return (media, rating);
    }

    private static Rating BaseRating(User user, int value) => new()
    {
        Id = Guid.NewGuid(),
        UserId = user.Id,
        Value = value,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };
}
