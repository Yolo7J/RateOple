using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestGenres
{
    private readonly ApplicationDbContext _context;

    public TestGenres(ApplicationDbContext context)
    {
        _context = context;
    }

    public Genre CreateGenre(string name = "Drama")
    {
        var genre = new Genre { Name = name };
        _context.Genres.Add(genre);
        return genre;
    }

    public async Task<Genre> CreateGenreAsync(string name = "Drama")
    {
        var genre = CreateGenre(name);
        await _context.SaveChangesAsync();
        return genre;
    }
}
