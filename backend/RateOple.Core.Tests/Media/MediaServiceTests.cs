using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using RateOple.Constants.Enums;
using RateOple.Core.Media.DTOs;
using RateOple.Core.Media.Services;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.Media;

public class MediaServiceTests
{
    [Fact]
    public async Task CreateMovieAsync_CreatesBaseMediaSubtypeAndGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var service = CreateService(db);

        var created = await service.CreateMovieAsync(new CreateMovieDto
        {
            Title = "Heat",
            Description = "Crime drama",
            CoverUrl = "https://example.test/heat.jpg",
            ReleaseYear = 1995,
            Director = "Michael Mann",
            Duration = 170,
            TmdbId = 949,
            GenreIds = [drama.Id]
        });

        Assert.Equal("Movie", created.Type);
        Assert.Equal("Heat", created.Title);
        Assert.Equal("https://example.test/heat.jpg", created.CoverUrl);
        Assert.Equal(1995, created.ReleaseYear);
        Assert.Equal("Michael Mann", created.Director);
        Assert.Equal(170, created.Duration);
        Assert.Contains("Drama", created.Genres);

        var media = await db.Context.Media
            .Include(m => m.Movie)
            .Include(m => m.MediaGenres)
            .SingleAsync(m => m.Id == created.Id);
        Assert.Equal(MediaType.Movie, media.Type);
        Assert.NotNull(media.Movie);
        Assert.Single(media.MediaGenres);
    }

    [Fact]
    public async Task CreateBookAsync_CreatesBaseMediaSubtypeAndPreservesBookFields()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var sciFi = await data.Genres.CreateGenreAsync("Sci-Fi");
        var service = CreateService(db);

        var created = await service.CreateBookAsync(new CreateBookDto
        {
            Title = "Dune",
            Description = "Desert power",
            CoverUrl = "https://example.test/dune.jpg",
            ReleaseYear = 1965,
            Author = "Frank Herbert",
            Pages = 412,
            Isbn = "9780441172719",
            OlId = "OL893415W",
            GenreIds = [sciFi.Id]
        });

        Assert.Equal("Book", created.Type);
        Assert.Equal("Frank Herbert", created.Author);
        Assert.Equal(412, created.Pages);
        Assert.Equal("9780441172719", created.Isbn);
        Assert.Equal("OL893415W", created.OlId);
        Assert.Contains("Sci-Fi", created.Genres);

        var media = await db.Context.Media.Include(m => m.Book).SingleAsync(m => m.Id == created.Id);
        Assert.Equal(MediaType.Book, media.Type);
        Assert.NotNull(media.Book);
    }

    [Fact]
    public async Task CreateTvSeriesAsync_CreatesBaseMediaSubtypeGenresAndSeasonTree()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = await data.Genres.CreateGenreAsync("Drama");
        var service = CreateService(db);

        var created = await service.CreateTvSeriesAsync(new CreateTvSeriesDto
        {
            Title = "The Wire",
            Description = "Baltimore",
            CoverUrl = "https://example.test/wire.jpg",
            ReleaseYear = 2002,
            TmdbId = 1438,
            GenreIds = [drama.Id],
            Seasons =
            [
                new CreateSeasonDto
                {
                    SeasonNumber = 1,
                    Episodes =
                    [
                        new CreateEpisodeDto { EpisodeNumber = 1, Title = "The Target", Duration = 62 }
                    ]
                }
            ]
        });

        Assert.Equal("TvSeries", created.Type);
        Assert.Equal(1438, created.TmdbId);
        Assert.Equal(1, created.SeasonsCount);
        Assert.Single(created.Seasons);
        Assert.Single(created.Seasons[0].Episodes);
        Assert.Contains("Drama", created.Genres);

        var media = await db.Context.Media
            .Include(m => m.TvSeries)
            .ThenInclude(tv => tv!.Seasons)
            .ThenInclude(s => s.Episodes)
            .SingleAsync(m => m.Id == created.Id);
        Assert.Equal(MediaType.TvSeries, media.Type);
        Assert.NotNull(media.TvSeries);
        Assert.Single(media.TvSeries!.Seasons);
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateOrMissingGenreIds()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = await data.Genres.CreateGenreAsync("Drama");
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateMovieAsync(new CreateMovieDto
        {
            Title = "Duplicate Genres",
            GenreIds = [genre.Id, genre.Id]
        }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateBookAsync(new CreateBookDto
        {
            Title = "Missing Genre",
            GenreIds = [genre.Id + 1000]
        }));

        Assert.Empty(db.Context.Media);
    }

    [Fact]
    public async Task UpdateMovieAsync_ChangesBaseMovieFieldsGenresAndKeepsRatingAggregate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var oldGenre = data.Genres.CreateGenre("Old");
        var newGenre = data.Genres.CreateGenre("New");
        var movie = data.Media.Movie("Old Title", genres: [oldGenre], averageRating: 8.5, ratingsCount: 4);
        await data.SaveAsync();
        var service = CreateService(db);

        var updated = await service.UpdateMovieAsync(movie.Id, new UpdateMovieDto
        {
            Title = "New Title",
            Description = "Updated",
            CoverUrl = "https://example.test/new.jpg",
            ReleaseYear = 2001,
            Director = "New Director",
            Duration = 111,
            GenreIds = [newGenre.Id]
        });

        Assert.Equal("New Title", updated.Title);
        Assert.Equal("Updated", updated.Description);
        Assert.Equal("https://example.test/new.jpg", updated.CoverUrl);
        Assert.Equal(2001, updated.ReleaseYear);
        Assert.Equal("New Director", updated.Director);
        Assert.Equal(111, updated.Duration);
        Assert.Equal(8.5, updated.AverageRating);
        Assert.Equal(4, updated.RatingsCount);
        Assert.Equal(["New"], updated.Genres);
    }

    [Fact]
    public async Task UpdateBookAsync_ChangesBaseBookFieldsAndReplacesGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var biography = data.Genres.CreateGenre("Biography");
        var book = data.Media.Book("Old Book");
        await data.SaveAsync();
        var service = CreateService(db);

        var updated = await service.UpdateBookAsync(book.Id, new UpdateBookDto
        {
            Title = "New Book",
            Author = "New Author",
            Pages = 321,
            Isbn = "isbn-123",
            GenreIds = [biography.Id]
        });

        Assert.Equal("New Book", updated.Title);
        Assert.Equal("New Author", updated.Author);
        Assert.Equal(321, updated.Pages);
        Assert.Equal("isbn-123", updated.Isbn);
        Assert.Equal(["Biography"], updated.Genres);
    }

    [Fact]
    public async Task UpdateTvSeriesAsync_ChangesBaseFieldsAndUpsertsSeasonEpisodes()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = data.Genres.CreateGenre("Mystery");
        var series = data.Media.TvSeries("Old Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        await data.Media.CreateEpisodeAsync(season, 1, "Old Pilot");
        db.Context.ChangeTracker.Clear();
        var service = CreateService(db);

        var updated = await service.UpdateTvSeriesAsync(series.Id, new UpdateTvSeriesDto
        {
            Title = "New Series",
            ReleaseYear = 2022,
            GenreIds = [genre.Id],
            Seasons =
            [
                new UpsertSeasonDto
                {
                    SeasonNumber = 1,
                    Episodes =
                    [
                        new UpsertEpisodeDto { EpisodeNumber = 1, Title = "New Pilot", Duration = 50 },
                        new UpsertEpisodeDto { EpisodeNumber = 2, Title = "Second", Duration = 48 }
                    ]
                }
            ]
        });

        Assert.Equal("New Series", updated.Title);
        Assert.Equal(2022, updated.ReleaseYear);
        Assert.Equal(["Mystery"], updated.Genres);
        Assert.Single(updated.Seasons);
        Assert.Equal(2, updated.Seasons[0].Episodes.Count);
        Assert.Contains(updated.Seasons[0].Episodes, e => e.EpisodeNumber == 1 && e.Title == "New Pilot");
    }

    [Fact]
    public async Task UpdateAsync_RejectsMissingWrongSubtypeDeletedAndInvalidGenres()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = data.Genres.CreateGenre("Drama");
        var book = data.Media.Book("Book");
        var deleted = data.Media.Movie("Deleted", isDeleted: true);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateMovieAsync(
            Guid.NewGuid(),
            new UpdateMovieDto { Title = "Missing" }));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateMovieAsync(
            book.Id,
            new UpdateMovieDto { Title = "Wrong" }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateMovieAsync(
            deleted.Id,
            new UpdateMovieDto { Title = "Deleted Update" }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateBookAsync(
            book.Id,
            new UpdateBookDto { GenreIds = [genre.Id, genre.Id] }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.UpdateBookAsync(
            book.Id,
            new UpdateBookDto { GenreIds = [genre.Id + 1000] }));
    }

    [Fact]
    public async Task SoftDeleteAsync_MarksMediaDeletedAndHidesItFromQueriesAndDetails()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var movie = data.Media.Movie("Visible Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await service.SoftDeleteAsync(movie.Id);

        var stored = await db.Context.Media.SingleAsync(m => m.Id == movie.Id);
        Assert.True(stored.IsDeleted);
        Assert.Null(await service.GetByIdAsync(movie.Id));

        var query = await service.GetAllAsync(new MediaQueryDto());
        Assert.Empty(query.Items);
        Assert.Equal(0, query.TotalCount);
    }

    [Fact]
    public async Task SoftDeleteAsync_DeletesTvSeriesChildrenAndRejectsMissingOrAlreadyDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var series = data.Media.TvSeries("Series");
        var season = await data.Media.CreateSeasonAsync(series, 1);
        var episode = await data.Media.CreateEpisodeAsync(season, 1);
        var service = CreateService(db);

        await service.SoftDeleteAsync(series.Id);

        Assert.True(await db.Context.Seasons.Where(s => s.Id == season.Id).Select(s => s.IsDeleted).SingleAsync());
        Assert.True(await db.Context.Episodes.Where(e => e.Id == episode.Id).Select(e => e.IsDeleted).SingleAsync());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SoftDeleteAsync(series.Id));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.SoftDeleteAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task GetAllAsync_FiltersSearchesSortsPaginatesAndExcludesDeletedMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var drama = data.Genres.CreateGenre("Drama");
        var comedy = data.Genres.CreateGenre("Comedy");
        var featured = data.Tags.CreateTag("featured");
        data.Media.Movie("Alpha Movie", releaseYear: 2000, genres: [drama], tags: [featured], averageRating: 9, ratingsCount: 5);
        data.Media.Book("Beta Book", releaseYear: 1990, genres: [comedy], averageRating: 6, ratingsCount: 2);
        data.Media.TvSeries("Gamma Series", releaseYear: 2010, genres: [drama], averageRating: 8, ratingsCount: 3);
        data.Media.Movie("Deleted Alpha", isDeleted: true, genres: [drama], tags: [featured], averageRating: 10, ratingsCount: 10);
        await data.SaveAsync();
        var service = CreateService(db);

        var search = await service.GetAllAsync(new MediaQueryDto { Search = "alpha" });
        Assert.Single(search.Items);
        Assert.Equal("Alpha Movie", search.Items[0].Title);

        var movies = await service.GetAllAsync(new MediaQueryDto { Types = ["movie"] });
        Assert.Single(movies.Items);
        Assert.Equal("Alpha Movie", movies.Items[0].Title);

        var dramaItems = await service.GetAllAsync(new MediaQueryDto { GenreIds = [drama.Id], SortBy = "title", SortDir = "asc" });
        Assert.Equal(["Alpha Movie", "Gamma Series"], dramaItems.Items.Select(i => i.Title).ToList());

        var tagged = await service.GetAllAsync(new MediaQueryDto { TagIds = [featured.Id] });
        Assert.Single(tagged.Items);

        var byYearDesc = await service.GetAllAsync(new MediaQueryDto { SortBy = "year", SortDir = "desc", Page = 1, PageSize = 2 });
        Assert.Equal(3, byYearDesc.TotalCount);
        Assert.Equal(2, byYearDesc.Items.Count);
        Assert.Equal(["Gamma Series", "Alpha Movie"], byYearDesc.Items.Select(i => i.Title).ToList());

        var normalized = await service.GetAllAsync(new MediaQueryDto { Page = 0, PageSize = 500 });
        Assert.Equal(1, normalized.Page);
        Assert.Equal(100, normalized.PageSize);
    }

    [Fact]
    public async Task GetGenresAndTags_ReturnExpectedValues()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        data.Genres.CreateGenre("Zulu");
        data.Genres.CreateGenre("Action");
        data.Tags.CreateTag("slow");
        data.Tags.CreateTag("classic");
        await data.SaveAsync();
        var service = CreateService(db);

        var genres = await service.GetGenresAsync();
        var tags = await service.GetTagsAsync();

        Assert.Equal(["Action", "Zulu"], genres.Select(g => g.Name).ToList());
        Assert.Equal(["classic", "slow"], tags.Select(t => t.Name).ToList());
    }

    [Fact]
    public async Task AddTagsAsync_CreatesNormalizesAndDeduplicatesTagsForMedia()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var media = data.Media.Movie("Tagged");
        await data.SaveAsync();
        var service = CreateService(db);

        var first = await service.AddTagsAsync(media.Id, new UpsertMediaTagsDto
        {
            TagNames = [" noir ", "Noir", "", "crime"]
        });
        var second = await service.AddTagsAsync(media.Id, new UpsertMediaTagsDto
        {
            TagNames = ["noir", "crime"]
        });

        Assert.Equal(["noir", "crime"], first.Tags);
        Assert.Equal(2, second.Tags.Count);
        Assert.Equal(2, await db.Context.MediaTags.CountAsync(mt => mt.MediaId == media.Id));
    }

    [Fact]
    public async Task AddAndRemoveTagsAsync_RejectDeletedOrMissingMediaAndRemoveIsIdempotent()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var tag = data.Tags.CreateTag("owned");
        var media = data.Media.Movie("Tagged", tags: [tag]);
        var deleted = data.Media.Movie("Deleted", isDeleted: true);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddTagsAsync(
            Guid.NewGuid(),
            new UpsertMediaTagsDto { TagNames = ["x"] }));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddTagsAsync(
            deleted.Id,
            new UpsertMediaTagsDto { TagNames = ["x"] }));

        var removed = await service.RemoveTagAsync(media.Id, tag.Id);
        var secondRemove = await service.RemoveTagAsync(media.Id, tag.Id);

        Assert.Empty(removed.Tags);
        Assert.Empty(secondRemove.Tags);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.RemoveTagAsync(deleted.Id, tag.Id));
    }

    [Fact]
    public async Task BulkCreateAsync_ReturnsPartialSuccessAndDoesNotCreateInvalidItems()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var genre = await data.Genres.CreateGenreAsync("Drama");
        var service = CreateService(db);

        var result = await service.BulkCreateAsync(new BulkCreateDto
        {
            Movies =
            [
                new CreateMovieDto { Title = "Valid Movie", GenreIds = [genre.Id] },
                new CreateMovieDto { Title = "Invalid Movie", GenreIds = [genre.Id + 1000] }
            ],
            Books =
            [
                new CreateBookDto { Title = "Valid Book" }
            ],
            TvSeries =
            [
                new CreateTvSeriesDto { Title = "Valid Series" }
            ]
        });

        Assert.Equal(3, result.Created.Count);
        Assert.Single(result.Errors);
        Assert.Equal("Invalid Movie", result.Errors[0].Title);
        Assert.Equal("Movie", result.Errors[0].Type);
        Assert.Equal(3, await db.Context.Media.CountAsync());
        Assert.Equal(1, await db.Context.Movies.CountAsync());
        Assert.Equal(1, await db.Context.Books.CountAsync());
        Assert.Equal(1, await db.Context.TvSeries.CountAsync());
    }

    private static MediaService CreateService(SqliteTestDb db)
    {
        return new MediaService(
            db.Context,
            new NoopOpenLibraryService(),
            NullLogger<MediaService>.Instance);
    }
}
