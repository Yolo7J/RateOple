using Microsoft.AspNetCore.Identity;
using RateOple.Constants.Constants;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Seeding
{
    public static class SuperAdminSeeder
    {
        public static async Task SeedAsync(
            UserManager<User> userManager
        )
        {
            var superAdminEmail = "potato7morkov@gmail.com";
            var superAdminUsername = "superadmin";
            var superAdminPassword = "ChangeThis123!";

            var existingUser = await userManager.FindByEmailAsync(superAdminEmail);
            if (existingUser != null)
                return;

            var user = new User
            {
                UserName = superAdminUsername,
                Email = superAdminEmail,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(user, superAdminPassword);
            if (!result.Succeeded)
                throw new Exception("Failed to create SuperAdmin user");

            await userManager.AddToRoleAsync(user, RoleConstants.SuperAdmin);
        }
    }
}
