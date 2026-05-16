using Microsoft.Extensions.Configuration;
using RateOple.Extensions;

namespace RateOple.Api.Tests.Security;

public class ProductionStartupGuardrailsTests
{
    [Fact]
    public void ValidateProductionConfiguration_RejectsPlaceholderJwtKey()
    {
        var configuration = BuildValidProductionConfiguration(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "DevelopmentOnlyJwtSigningKey-ReplaceWithUserSecrets-32Bytes"
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Jwt:Key", ex.Message);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsHttpPublicOrigin()
    {
        var configuration = BuildValidProductionConfiguration(new Dictionary<string, string?>
        {
            ["App:PublicOrigin"] = "http://rateople.example.test"
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("HTTPS", ex.Message);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsWeakSuperAdminSeedPassword()
    {
        var configuration = BuildValidProductionConfiguration(new Dictionary<string, string?>
        {
            ["Seed:Mode"] = "Required",
            ["Seed:SuperAdmin:Enabled"] = "true",
            ["Seed:SuperAdmin:Email"] = "admin@example.test",
            ["Seed:SuperAdmin:Username"] = "admin",
            ["Seed:SuperAdmin:Password"] = "Password1!"
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("weak", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateProductionConfiguration_AcceptsValidProductionConfiguration()
    {
        var configuration = BuildValidProductionConfiguration();

        ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration);
    }

    private static IConfiguration BuildValidProductionConfiguration(Dictionary<string, string?>? overrides = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=db.example.test;Database=rateople;Username=rateople;Password=strong-db-password",
            ["Jwt:Key"] = "RateOpleProductionSigningKey-2026-Strong-Random-Value!",
            ["Jwt:Issuer"] = "RateOple",
            ["Jwt:Audience"] = "RateOple",
            ["App:PublicOrigin"] = "https://rateople.example.test",
            ["Authentication:Google:ClientId"] = "google-client-id",
            ["Authentication:Google:ClientSecret"] = "google-client-secret",
            ["Email:Provider"] = "Resend",
            ["Email:From"] = "RateOple <no-reply@example.test>",
            ["Resend:ApiKey"] = "resend-api-key",
            ["Tmdb:ReadAccessToken"] = "tmdb-read-token",
            ["Captcha:Enabled"] = "true",
            ["Captcha:Provider"] = "Turnstile",
            ["Captcha:SiteKey"] = "turnstile-site-key",
            ["Captcha:SecretKey"] = "turnstile-secret-key",
            ["Captcha:VerifyUrl"] = "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            ["Seed:Mode"] = "None"
        };

        if (overrides is not null)
        {
            foreach (var (key, value) in overrides)
                values[key] = value;
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }
}
