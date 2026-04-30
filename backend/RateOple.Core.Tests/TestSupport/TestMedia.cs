using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestMedia
{
    private readonly ApplicationDbContext _context;

    public TestMedia(ApplicationDbContext context)
    {
        _context = context;
    }

    public MediaEntity Movie(
        string title = "Test Movie",
        bool isDeleted = false,
        int? releaseYear = 2020,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null,
        double averageRating = 0,
        int ratingsCount = 0)
    {
        var media = Base(title, MediaType.Movie, isDeleted, releaseYear, averageRating, ratingsCount);
        _context.Media.Add(media);
        _context.Movies.Add(new Movie { MediaId = media.Id, Duration = 120 });
        AttachGenres(media, genres);
        AttachTags(media, tags);
        return media;
    }

    public MediaEntity Book(
        string title = "Test Book",
        bool isDeleted = false,
        int? releaseYear = 2020,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null,
        double averageRating = 0,
        int ratingsCount = 0)
    {
        var media = Base(title, MediaType.Book, isDeleted, releaseYear, averageRating, ratingsCount);
        _context.Media.Add(media);
        _context.Books.Add(new Book { MediaId = media.Id, Author = "Test Author" });
        AttachGenres(media, genres);
        AttachTags(media, tags);
        return media;
    }

    public MediaEntity TvSeries(
        string title = "Test Series",
        bool isDeleted = false,
        int? releaseYear = 2020,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null,
        double averageRating = 0,
        int ratingsCount = 0)
    {
        var media = Base(title, MediaType.TvSeries, isDeleted, releaseYear, averageRating, ratingsCount);
        _context.Media.Add(media);
        _context.TvSeries.Add(new TvSeries { MediaId = media.Id, SeasonsCount = 1 });
        AttachGenres(media, genres);
        AttachTags(media, tags);
        return media;
    }

    public async Task<MediaEntity> CreateMovieAsync(
        string title = "Test Movie",
        int? releaseYear = 2020,
        bool isDeleted = false,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null)
    {
        var media = Movie(title, isDeleted, releaseYear, genres, tags);
        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreateBookAsync(
        string title = "Test Book",
        int? releaseYear = 2020,
        bool isDeleted = false,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null)
    {
        var media = Book(title, isDeleted, releaseYear, genres, tags);
        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<MediaEntity> CreateTvSeriesAsync(
        string title = "Test Series",
        int? releaseYear = 2020,
        bool isDeleted = false,
        IEnumerable<Genre>? genres = null,
        IEnumerable<Tag>? tags = null)
    {
        var media = TvSeries(title, isDeleted, releaseYear, genres, tags);
        await _context.SaveChangesAsync();
        return media;
    }

    public async Task<Genre> CreateGenreAsync(string name = "Drama")
    {
        var genre = new Genre { Name = name };
        _context.Genres.Add(genre);
        await _context.SaveChangesAsync();
        return genre;
    }

    public async Task<Tag> CreateTagAsync(string name = "classic")
    {
        var tag = new Tag { Name = name };
        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();
        return tag;
    }

    public async Task<Season> CreateSeasonAsync(MediaEntity tvSeries, int seasonNumber = 1, bool isDeleted = false)
    {
        var season = new Season
        {
            Id = Guid.NewGuid(),
            TvSeriesId = tvSeries.Id,
            SeasonNumber = seasonNumber,
            IsDeleted = isDeleted
        };
        _context.Seasons.Add(season);
        tvSeries.TvSeries?.Seasons.Add(season);
        await _context.SaveChangesAsync();
        return season;
    }

    public async Task<Episode> CreateEpisodeAsync(
        Season season,
        int episodeNumber = 1,
        string? title = null,
        bool isDeleted = false)
    {
        var episode = new Episode
        {
            Id = Guid.NewGuid(),
            SeasonId = season.Id,
            EpisodeNumber = episodeNumber,
            Title = title ?? $"Episode {episodeNumber}",
            Duration = 45,
            IsDeleted = isDeleted
        };
        _context.Episodes.Add(episode);
        season.Episodes.Add(episode);
        await _context.SaveChangesAsync();
        return episode;
    }

    public Task<MediaEntity> CreateDeletedMediaAsync(string title = "Deleted Movie") =>
        CreateMovieAsync(title, isDeleted: true);

    public async Task<MediaEntity> CreateRatedMediaAsync(
        string title = "Rated Movie",
        double averageRating = 8.5,
        int ratingsCount = 2)
    {
        var media = Movie(title, averageRating: averageRating, ratingsCount: ratingsCount);
        await _context.SaveChangesAsync();
        return media;
    }

    private static MediaEntity Base(
        string title,
        MediaType type,
        bool isDeleted,
        int? releaseYear,
        double averageRating = 0,
        int ratingsCount = 0)
    {
        return new MediaEntity
        {
            Id = Guid.NewGuid(),
            Type = type,
            Title = title,
            CoverUrl = $"https://example.test/{Uri.EscapeDataString(title)}.jpg",
            CreatedAt = DateTime.UtcNow,
            ReleaseDate = releaseYear.HasValue ? new DateTime(releaseYear.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc) : null,
            AverageRating = averageRating,
            RatingsCount = ratingsCount,
            IsDeleted = isDeleted
        };
    }

    private void AttachGenres(MediaEntity media, IEnumerable<Genre>? genres)
    {
        if (genres == null)
            return;

        foreach (var genre in genres)
        {
            _context.MediaGenres.Add(new MediaGenre { MediaId = media.Id, Genre = genre });
        }
    }

    private void AttachTags(MediaEntity media, IEnumerable<Tag>? tags)
    {
        if (tags == null)
            return;

        foreach (var tag in tags)
        {
            _context.MediaTags.Add(new MediaTag { MediaId = media.Id, Tag = tag });
        }
    }
}
