using Microsoft.AspNetCore.Identity;
using RateOple.Constants.Constants;

namespace RateOple.Infrastructure.Data.Seeding
{
    public static class RoleSeeder
    {
        public static async Task SeedAsync(RoleManager<IdentityRole<Guid>> roleManager)
        {
            foreach (var role in RoleConstants.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                }
            }
        }
    }
}
