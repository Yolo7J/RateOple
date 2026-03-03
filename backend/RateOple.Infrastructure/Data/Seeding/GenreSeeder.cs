using Microsoft.EntityFrameworkCore;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Seeding;

public static class GenreSeeder
{
    private static readonly string[] DefaultGenres =
    [
        "Action", "Adventure", "Animation", "Biography", "Comedy",
        "Crime", "Documentary", "Drama", "Fantasy", "History",
        "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"
    ];

    public static async Task SeedAsync(ApplicationDbContext db)
    {
        var existing = await db.Genres.Select(g => g.Name).ToListAsync();
        var toAdd = DefaultGenres
            .Where(name => !existing.Contains(name))
            .Select(name => new Genre { Name = name })
            .ToList();

        if (toAdd.Count > 0)
        {
            db.Genres.AddRange(toAdd);
            await db.SaveChangesAsync();
        }
    }
}