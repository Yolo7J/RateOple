namespace RateOple.Infrastructure.Data.Seeding;

public enum SeedMode
{
    None = 0,
    Required = 1,
    Demo = 2
}

public sealed class SeedOptions
{
    public SeedMode Mode { get; set; } = SeedMode.None;
    public SuperAdminSeedOptions SuperAdmin { get; set; } = new();
    public List<DemoUserSeedOptions> DemoUsers { get; set; } = [];
}

public sealed class SuperAdminSeedOptions
{
    public bool Enabled { get; set; }
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
}

public sealed class DemoUserSeedOptions
{
    public string? Email { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? Role { get; set; }
    public string? DisplayName { get; set; }
}

public static class SeedOptionsValidator
{
    private static readonly string[] PlaceholderPasswords =
    [
        "ChangeThis123!",
        "Admin123!",
        "Mod123!",
        "User123!",
        "Password123!",
        "password"
    ];

    public static void Validate(SeedOptions options, bool isDevelopment)
    {
        if (options.Mode == SeedMode.Demo && !isDevelopment)
            throw new InvalidOperationException("Seed:Mode=Demo is only allowed in Development.");

        if (!isDevelopment && HasPlaceholderPassword(options.SuperAdmin.Password))
            throw new InvalidOperationException("Super-admin seed password is a known placeholder and is not allowed outside Development.");

        if (options.Mode == SeedMode.Demo)
        {
            ValidateSuperAdmin(options.SuperAdmin, requireCredentials: true);
            ValidateDemoUsers(options);
            return;
        }

        if (options.Mode == SeedMode.Required)
        {
            var hasAnySuperAdminValue = options.SuperAdmin.Enabled
                || !string.IsNullOrWhiteSpace(options.SuperAdmin.Email)
                || !string.IsNullOrWhiteSpace(options.SuperAdmin.Username)
                || !string.IsNullOrWhiteSpace(options.SuperAdmin.Password);

            if (hasAnySuperAdminValue)
                ValidateSuperAdmin(options.SuperAdmin, requireCredentials: true);
        }
    }

    private static void ValidateSuperAdmin(SuperAdminSeedOptions options, bool requireCredentials)
    {
        if (!requireCredentials)
            return;

        if (string.IsNullOrWhiteSpace(options.Email))
            throw new InvalidOperationException("Seed:SuperAdmin:Email is required when super-admin seeding is enabled.");
        if (string.IsNullOrWhiteSpace(options.Username))
            throw new InvalidOperationException("Seed:SuperAdmin:Username is required when super-admin seeding is enabled.");
        if (string.IsNullOrWhiteSpace(options.Password))
            throw new InvalidOperationException("Seed:SuperAdmin:Password is required when super-admin seeding is enabled.");
        if (HasPlaceholderPassword(options.Password))
            throw new InvalidOperationException("Seed:SuperAdmin:Password cannot use a known placeholder password.");
    }

    private static void ValidateDemoUsers(SeedOptions options)
    {
        foreach (var user in options.DemoUsers)
        {
            if (string.IsNullOrWhiteSpace(user.Email)
                || string.IsNullOrWhiteSpace(user.Username)
                || string.IsNullOrWhiteSpace(user.Password)
                || string.IsNullOrWhiteSpace(user.Role))
            {
                throw new InvalidOperationException("Every configured demo user requires Email, Username, Password, and Role.");
            }

            if (HasPlaceholderPassword(user.Password))
                throw new InvalidOperationException($"Demo user '{user.Email}' uses a known placeholder password.");
        }
    }

    private static bool HasPlaceholderPassword(string? password)
    {
        return !string.IsNullOrWhiteSpace(password)
            && PlaceholderPasswords.Contains(password, StringComparer.OrdinalIgnoreCase);
    }
}
