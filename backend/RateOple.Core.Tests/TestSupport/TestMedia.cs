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

    public MediaEntity Movie(string title = "Test Movie", bool isDeleted = false)
    {
        var media = Base(title, MediaType.Movie, isDeleted);
        _context.Media.Add(media);
        _context.Movies.Add(new Movie { MediaId = media.Id, Duration = 120 });
        return media;
    }

    public MediaEntity Book(string title = "Test Book", bool isDeleted = false)
    {
        var media = Base(title, MediaType.Book, isDeleted);
        _context.Media.Add(media);
        _context.Books.Add(new Book { MediaId = media.Id, Author = "Test Author" });
        return media;
    }

    public MediaEntity TvSeries(string title = "Test Series", bool isDeleted = false)
    {
        var media = Base(title, MediaType.TvSeries, isDeleted);
        _context.Media.Add(media);
        _context.TvSeries.Add(new TvSeries { MediaId = media.Id, SeasonsCount = 1 });
        return media;
    }

    private static MediaEntity Base(string title, MediaType type, bool isDeleted)
    {
        return new MediaEntity
        {
            Id = Guid.NewGuid(),
            Type = type,
            Title = title,
            CoverUrl = $"https://example.test/{Uri.EscapeDataString(title)}.jpg",
            CreatedAt = DateTime.UtcNow,
            ReleaseDate = new DateTime(2020, 1, 1),
            IsDeleted = isDeleted
        };
    }
}
