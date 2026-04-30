using Microsoft.AspNetCore.Identity;
using RateOple.Constants.Constants;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Seeding
{
    public static class SuperAdminSeeder
    {
        public static async Task SeedAsync(
            UserManager<User> userManager,
            SuperAdminSeedOptions options
        )
        {
            if (!options.Enabled
                && string.IsNullOrWhiteSpace(options.Email)
                && string.IsNullOrWhiteSpace(options.Username)
                && string.IsNullOrWhiteSpace(options.Password))
            {
                return;
            }

            var superAdminEmail = options.Email!.Trim();
            var superAdminUsername = options.Username!.Trim();
            var superAdminPassword = options.Password!;

            var existingUser = await userManager.FindByEmailAsync(superAdminEmail)
                ?? await userManager.FindByNameAsync(superAdminUsername);
            if (existingUser != null)
            {
                await EnsureSuperAdminRoleAsync(userManager, existingUser);
                return;
            }

            var user = new User
            {
                UserName = superAdminUsername,
                Email = superAdminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(user, superAdminPassword);
            if (!result.Succeeded)
                throw new InvalidOperationException($"Failed to create SuperAdmin user: {string.Join(", ", result.Errors.Select(e => e.Description))}");

            await EnsureSuperAdminRoleAsync(userManager, user);
        }

        private static async Task EnsureSuperAdminRoleAsync(UserManager<User> userManager, User user)
        {
            if (!await userManager.IsInRoleAsync(user, RoleConstants.SuperAdmin))
                await userManager.AddToRoleAsync(user, RoleConstants.SuperAdmin);
        }
    }
}
