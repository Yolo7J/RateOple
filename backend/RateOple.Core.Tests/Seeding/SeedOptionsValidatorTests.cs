using RateOple.Infrastructure.Data.Seeding;

namespace RateOple.Core.Tests.Seeding;

public class SeedOptionsValidatorTests
{
    [Fact]
    public void Validate_RejectsDemoModeOutsideDevelopment()
    {
        var options = new SeedOptions
        {
            Mode = SeedMode.Demo,
            SuperAdmin = ValidSuperAdmin(),
            DemoUsers =
            [
                new DemoUserSeedOptions
                {
                    Email = "demo@example.com",
                    Username = "demo",
                    Password = "UniqueDemoPassword!2026",
                    Role = "User"
                }
            ]
        };

        var ex = Assert.Throws<InvalidOperationException>(
            () => SeedOptionsValidator.Validate(options, isDevelopment: false));

        Assert.Contains("only allowed in Development", ex.Message);
    }

    [Fact]
    public void Validate_RejectsPlaceholderSuperAdminPassword()
    {
        var options = new SeedOptions
        {
            Mode = SeedMode.Required,
            SuperAdmin = new SuperAdminSeedOptions
            {
                Enabled = true,
                Email = "admin@example.com",
                Username = "admin",
                Password = "ChangeThis123!"
            }
        };

        var ex = Assert.Throws<InvalidOperationException>(
            () => SeedOptionsValidator.Validate(options, isDevelopment: false));

        Assert.Contains("placeholder", ex.Message);
    }

    [Fact]
    public void Validate_RequiredModeRejectsMissingSuperAdminCredentialsWhenEnabled()
    {
        var options = new SeedOptions
        {
            Mode = SeedMode.Required,
            SuperAdmin = new SuperAdminSeedOptions
            {
                Enabled = true,
                Email = "admin@example.com",
                Username = "admin"
            }
        };

        var ex = Assert.Throws<InvalidOperationException>(
            () => SeedOptionsValidator.Validate(options, isDevelopment: true));

        Assert.Contains("Password is required", ex.Message);
    }

    [Fact]
    public void Validate_RequiredModeCanRunWithoutSuperAdminFallbackCredentials()
    {
        var options = new SeedOptions
        {
            Mode = SeedMode.Required
        };

        SeedOptionsValidator.Validate(options, isDevelopment: false);
    }

    private static SuperAdminSeedOptions ValidSuperAdmin()
    {
        return new SuperAdminSeedOptions
        {
            Enabled = true,
            Email = "admin@example.com",
            Username = "admin",
            Password = "UniqueSuperAdminPassword!2026"
        };
    }
}
