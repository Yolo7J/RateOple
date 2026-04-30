using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestUsers
{
    private readonly ApplicationDbContext _context;

    public TestUsers(ApplicationDbContext context)
    {
        _context = context;
    }

    public User Normal(string userName = "test-user") => Build(userName);

    public User Admin(string userName = "admin-user") => Build(userName);

    public User Moderator(string userName = "moderator-user") => Build(userName);

    public User Build(string userName, Guid? id = null)
    {
        var normalized = userName.ToUpperInvariant();
        return new User
        {
            Id = id ?? Guid.NewGuid(),
            UserName = userName,
            NormalizedUserName = normalized,
            Email = $"{userName}@example.test",
            NormalizedEmail = $"{normalized}@EXAMPLE.TEST",
            EmailConfirmed = true,
            AvatarUrl = UserConstants.DefaultAvatarUrl,
            Visibility = UserVisibility.Public,
            CreatedAt = DateTime.UtcNow,
            SecurityStamp = Guid.NewGuid().ToString()
        };
    }

    public User Add(User user)
    {
        _context.Users.Add(user);
        return user;
    }

    public UserProfile Profile(User user, string? displayName = null)
    {
        var profile = new UserProfile
        {
            UserId = user.Id,
            DisplayName = displayName ?? user.UserName ?? "Test User",
            AvatarUrl = user.AvatarUrl,
            Bio = user.Bio,
            PrivacySetting = user.Visibility == UserVisibility.Private
                ? PrivacySetting.Private
                : PrivacySetting.Public,
            UpdatedAt = DateTime.UtcNow
        };

        _context.UserProfiles.Add(profile);
        return profile;
    }

    public RefreshToken RefreshToken(User user, string tokenHash = "hashed-token", bool revoked = false, DateTime? expiresAt = null)
    {
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = tokenHash,
            Revoked = revoked,
            ExpiresAt = expiresAt ?? DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _context.RefreshTokens.Add(token);
        return token;
    }

    public static async Task<UserManager<User>> CreateUserManagerAsync(ApplicationDbContext context)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(context);
        services.AddIdentityCore<User>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();

        var provider = services.BuildServiceProvider();
        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in RoleConstants.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        return provider.GetRequiredService<UserManager<User>>();
    }
}
