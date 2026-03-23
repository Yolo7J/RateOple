using Microsoft.AspNetCore.Identity;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using RateOple.Infrastructure.Data.Seeding;

namespace RateOple.Extensions;

public static class SeedingExtensions
{
    public static async Task SeedDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;

        try
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = services.GetRequiredService<UserManager<User>>();
            var db = services.GetRequiredService<ApplicationDbContext>();

            await RoleSeeder.SeedAsync(roleManager);
            await SuperAdminSeeder.SeedAsync(userManager);
            await TestUsersSeeder.SeedAsync(userManager, db);
            await GenreSeeder.SeedAsync(db);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while seeding the database.");
        }
    }
}
