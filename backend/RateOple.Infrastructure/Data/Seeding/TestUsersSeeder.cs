using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Seeding;

public static class TestUsersSeeder
{
    public static async Task SeedAsync(
        UserManager<User> userManager,
        ApplicationDbContext db,
        IReadOnlyCollection<DemoUserSeedOptions> users)
    {
        foreach (var seed in users)
        {
            var email = seed.Email!.Trim();
            var username = seed.Username!.Trim();
            var user = await userManager.FindByEmailAsync(email)
                ?? await userManager.FindByNameAsync(username);
            if (user == null)
            {
                user = new User
                {
                    UserName = username,
                    Email = email,
                    EmailConfirmed = true
                };

                var result = await userManager.CreateAsync(user, seed.Password!);
                if (!result.Succeeded)
                    throw new InvalidOperationException($"Failed to create test user '{email}': {string.Join(", ", result.Errors.Select(e => e.Description))}");
            }

            var role = seed.Role!.Trim();
            if (!RoleConstants.All.Contains(role))
                throw new InvalidOperationException($"Demo user '{email}' uses unknown role '{role}'.");

            if (!await userManager.IsInRoleAsync(user, role))
                await userManager.AddToRoleAsync(user, role);

            var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile == null)
            {
                db.UserProfiles.Add(new UserProfile
                {
                    UserId = user.Id,
                    DisplayName = string.IsNullOrWhiteSpace(seed.DisplayName)
                        ? user.UserName ?? email
                        : seed.DisplayName.Trim(),
                    AvatarUrl = user.AvatarUrl,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
