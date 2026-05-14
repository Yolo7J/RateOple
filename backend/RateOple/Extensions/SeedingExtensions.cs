using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
            var logger = services.GetRequiredService<ILogger<Program>>();
            var seedOptions = services.GetRequiredService<IOptions<SeedOptions>>().Value;
            SeedOptionsValidator.Validate(seedOptions, app.Environment.IsDevelopment());

            if (seedOptions.Mode == SeedMode.None)
            {
                logger.LogInformation("Database seeding skipped. Seed mode: {SeedMode}", seedOptions.Mode);
                return;
            }

            var db = services.GetRequiredService<ApplicationDbContext>();

            if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
            {
                logger.LogInformation("Applying pending database migrations before seeding.");
                await db.Database.MigrateAsync();
            }

            var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = services.GetRequiredService<UserManager<User>>();

            await RoleSeeder.SeedAsync(roleManager);
            await GenreSeeder.SeedAsync(db);

            if (seedOptions.SuperAdmin.Enabled
                || !string.IsNullOrWhiteSpace(seedOptions.SuperAdmin.Email)
                || !string.IsNullOrWhiteSpace(seedOptions.SuperAdmin.Username)
                || !string.IsNullOrWhiteSpace(seedOptions.SuperAdmin.Password))
            {
                await SuperAdminSeeder.SeedAsync(userManager, seedOptions.SuperAdmin);
            }

            if (seedOptions.Mode == SeedMode.Demo)
            {
                await TestUsersSeeder.SeedAsync(userManager, db, seedOptions.DemoUsers);
            }

            logger.LogInformation(
                "Database seeding completed. Seed mode: {SeedMode}; Demo users configured: {DemoUserCount}",
                seedOptions.Mode,
                seedOptions.DemoUsers.Count);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }
}
