using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Seeding;

public static class TestUsersSeeder
{
    private sealed record SeedUser(string Email, string UserName, string Password, string Role, string DisplayName);

    public static async Task SeedAsync(UserManager<User> userManager, ApplicationDbContext db)
    {
        var users = new[]
        {
            new SeedUser("admin@test.com", "admin", "Admin123!", RoleConstants.Admin, "Admin"),
            new SeedUser("mod@test.com", "moderator", "Mod123!", RoleConstants.Moderator, "Moderator"),
            new SeedUser("user@test.com", "user", "User123!", RoleConstants.User, "User")
        };

        foreach (var seed in users)
        {
            var user = await userManager.FindByEmailAsync(seed.Email);
            if (user == null)
            {
                user = new User
                {
                    UserName = seed.UserName,
                    Email = seed.Email,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(user, seed.Password);
                if (!result.Succeeded)
                    throw new Exception($"Failed to create test user '{seed.Email}': {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }

            if (!await userManager.IsInRoleAsync(user, seed.Role))
                await userManager.AddToRoleAsync(user, seed.Role);

            var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile == null)
            {
                db.UserProfiles.Add(new UserProfile
                {
                    UserId = user.Id,
                    DisplayName = seed.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
