using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestDiscovery
{
    private readonly ApplicationDbContext _context;
    private readonly TestMedia _media;
    private readonly TestReviews _reviews;
    private readonly TestInteractions _interactions;

    public TestDiscovery(
        ApplicationDbContext context,
        TestMedia media,
        TestReviews reviews,
        TestInteractions interactions)
    {
        _context = context;
        _media = media;
        _reviews = reviews;
        _interactions = interactions;
    }

    public async Task<MediaEntity> CreateMediaWithRatingAsync(
        User user,
        string title = "Rated Discovery Movie",
        int ratingValue = 8,
        double averageRating = 8,
        int ratingsCount = 1,
        IEnumerable<Genre>? genres = null,
        bool isDeleted = false,
        DateTime? ratingUpdatedAt = null)
    {
        var media = _media.Movie(title, isDeleted: isDeleted, genres: genres, averageRating: averageRating, ratingsCount: ratingsCount);
        var rating = _reviews.RatingForMedia(user, media, ratingValue);
        if (ratingUpdatedAt.HasValue)
        {
            rating.CreatedAt = ratingUpdatedAt.Value;
            rating.UpdatedAt = ratingUpdatedAt.Value;
        }

        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreateMediaWithGenresAsync(
        string title,
        IEnumerable<Genre> genres,
        MediaType type = MediaType.Movie,
        double averageRating = 0,
        int ratingsCount = 0,
        bool isDeleted = false)
    {
        var media = CreateByType(title, type, genres: genres, averageRating: averageRating, ratingsCount: ratingsCount, isDeleted: isDeleted);
        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreateMediaWithTagsAsync(
        string title,
        IEnumerable<Tag> tags,
        MediaType type = MediaType.Movie,
        double averageRating = 0,
        int ratingsCount = 0,
        bool isDeleted = false)
    {
        var media = CreateByType(title, type, tags: tags, averageRating: averageRating, ratingsCount: ratingsCount, isDeleted: isDeleted);
        await _context.SaveChangesAsync();
        return media;
    }

    public Task<MediaInteraction> CreateInteractionAsync(
        User user,
        MediaEntity media,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null) =>
        _interactions.CreateInteractionAsync(user, media, interactionType, points, createdAt);

    public Task<MediaInteraction> CreateMediaInteractionAsync(
        User user,
        MediaEntity media,
        InteractionType interactionType = InteractionType.MediaOpened,
        int points = 1,
        DateTime? createdAt = null) =>
        _interactions.CreateMediaInteractionAsync(user, media, interactionType, points, createdAt);

    public async Task<UserGenreScore> CreateUserGenreScoreAsync(
        User user,
        Genre genre,
        double score = 10,
        DateTime? updatedAt = null)
    {
        var userGenreScore = new UserGenreScore
        {
            UserId = user.Id,
            GenreId = genre.Id,
            Score = score,
            UpdatedAt = updatedAt ?? DateTime.UtcNow
        };

        _context.UserGenreScores.Add(userGenreScore);
        await _context.SaveChangesAsync();
        return userGenreScore;
    }

    public async Task<(MediaEntity Media, Rating Rating)> CreateRatedMediaWithGenresAsync(
        User user,
        IEnumerable<Genre> genres,
        string title = "Rated Genre Movie",
        int ratingValue = 8,
        MediaType type = MediaType.Movie,
        bool isDeleted = false)
    {
        var media = CreateByType(title, type, genres: genres, isDeleted: isDeleted);
        var rating = _reviews.RatingForMedia(user, media, ratingValue);
        await _context.SaveChangesAsync();
        return (media, rating);
    }

    public async Task<(MediaEntity Series, Season Season, Rating Rating)> CreateRatedSeasonWithSeriesGenresAsync(
        User user,
        IEnumerable<Genre> genres,
        string title = "Rated Season Series",
        int ratingValue = 8,
        bool isSeriesDeleted = false,
        bool isSeasonDeleted = false)
    {
        var series = _media.TvSeries(title, isDeleted: isSeriesDeleted, genres: genres);
        await _context.SaveChangesAsync();
        var season = await _media.CreateSeasonAsync(series, isDeleted: isSeasonDeleted);
        var rating = _reviews.RatingForSeason(user, season, ratingValue);
        await _context.SaveChangesAsync();
        return (series, season, rating);
    }

    public async Task<(MediaEntity Series, Season Season, Episode Episode, Rating Rating)> CreateRatedEpisodeWithSeriesGenresAsync(
        User user,
        IEnumerable<Genre> genres,
        string title = "Rated Episode Series",
        int ratingValue = 8,
        bool isSeriesDeleted = false,
        bool isSeasonDeleted = false,
        bool isEpisodeDeleted = false)
    {
        var series = _media.TvSeries(title, isDeleted: isSeriesDeleted, genres: genres);
        await _context.SaveChangesAsync();
        var season = await _media.CreateSeasonAsync(series, isDeleted: isSeasonDeleted);
        var episode = await _media.CreateEpisodeAsync(season, isDeleted: isEpisodeDeleted);
        var rating = _reviews.RatingForEpisode(user, episode, ratingValue);
        await _context.SaveChangesAsync();
        return (series, season, episode, rating);
    }

    public Task<(MediaEntity Media, Rating Rating)> CreateDeletedRatedMediaWithGenresAsync(
        User user,
        IEnumerable<Genre> genres,
        string title = "Deleted Rated Genre Movie",
        int ratingValue = 8,
        MediaType type = MediaType.Movie) =>
        CreateRatedMediaWithGenresAsync(user, genres, title, ratingValue, type, isDeleted: true);

    public async Task<MediaEntity> CreateRecentlyReviewedMediaAsync(
        User user,
        string title = "Recently Reviewed Movie",
        int ratingValue = 8,
        double averageRating = 8,
        int ratingsCount = 1,
        DateTime? reviewedAt = null)
    {
        var media = _media.Movie(title, averageRating: averageRating, ratingsCount: ratingsCount);
        var rating = _reviews.RatingForMedia(user, media, ratingValue);
        var review = _reviews.Review(user, media, rating, $"Review for {title}");
        if (reviewedAt.HasValue)
        {
            review.CreatedAt = reviewedAt.Value;
            review.UpdatedAt = reviewedAt.Value;
        }

        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreatePopularMediaAsync(
        string title = "Popular Movie",
        MediaType type = MediaType.Movie,
        double averageRating = 8,
        int ratingsCount = 10,
        IEnumerable<Genre>? genres = null,
        bool isDeleted = false)
    {
        var media = CreateByType(title, type, genres: genres, averageRating: averageRating, ratingsCount: ratingsCount, isDeleted: isDeleted);
        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreateDeletedDiscoverableMediaAsync(
        string title = "Deleted Discoverable Movie",
        MediaType type = MediaType.Movie,
        double averageRating = 10,
        int ratingsCount = 100,
        IEnumerable<Genre>? genres = null)
    {
        var media = CreateByType(title, type, genres: genres, averageRating: averageRating, ratingsCount: ratingsCount, isDeleted: true);
        await _context.SaveChangesAsync();
        return media;
    }

    private MediaEntity CreateByType(
        string title,
        MediaType type,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null,
        double averageRating = 0,
        int ratingsCount = 0,
        bool isDeleted = false)
    {
        return type switch
        {
            MediaType.Book => _media.Book(title, isDeleted: isDeleted, genres: genres, tags: tags, averageRating: averageRating, ratingsCount: ratingsCount),
            MediaType.TvSeries => _media.TvSeries(title, isDeleted: isDeleted, genres: genres, tags: tags, averageRating: averageRating, ratingsCount: ratingsCount),
            _ => _media.Movie(title, isDeleted: isDeleted, genres: genres, tags: tags, averageRating: averageRating, ratingsCount: ratingsCount)
        };
    }
}
