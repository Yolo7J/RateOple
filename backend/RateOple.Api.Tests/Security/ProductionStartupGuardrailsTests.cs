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
    public void ValidateProductionConfiguration_AcceptsValidResendProductionConfiguration()
    {
        var configuration = BuildValidProductionConfiguration();

        ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration);
    }

    [Fact]
    public void ValidateProductionConfiguration_AcceptsValidSmtpProductionConfiguration()
    {
        var configuration = BuildValidSmtpProductionConfiguration();

        ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsSmtpProviderWithMissingHost()
    {
        var configuration = BuildValidSmtpProductionConfiguration(new Dictionary<string, string?>
        {
            ["Smtp:Host"] = null
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Smtp:Host", ex.Message);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsSmtpProviderWithMissingUsername()
    {
        var configuration = BuildValidSmtpProductionConfiguration(new Dictionary<string, string?>
        {
            ["Smtp:Username"] = null
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Smtp:Username", ex.Message);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsSmtpProviderWithMissingPassword()
    {
        var configuration = BuildValidSmtpProductionConfiguration(new Dictionary<string, string?>
        {
            ["Smtp:Password"] = null
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Smtp:Password", ex.Message);
    }

    [Fact]
    public void ValidateProductionConfiguration_RejectsSmtpProviderWithPlaceholderPassword()
    {
        var configuration = BuildValidSmtpProductionConfiguration(new Dictionary<string, string?>
        {
            ["Smtp:Password"] = "<GOOGLE_APP_PASSWORD>"
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Smtp:Password", ex.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("65536")]
    [InlineData("not-a-port")]
    public void ValidateProductionConfiguration_RejectsSmtpProviderWithInvalidPort(string port)
    {
        var configuration = BuildValidSmtpProductionConfiguration(new Dictionary<string, string?>
        {
            ["Smtp:Port"] = port
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Smtp:Port", ex.Message);
    }

    [Theory]
    [InlineData("Fake")]
    [InlineData("Noop")]
    public void ValidateProductionConfiguration_RejectsDevelopmentOnlyEmailProviders(string provider)
    {
        var configuration = BuildValidProductionConfiguration(new Dictionary<string, string?>
        {
            ["Email:Provider"] = provider
        });

        var ex = Assert.Throws<InvalidOperationException>(
            () => ProductionStartupGuardrailsExtensions.ValidateProductionConfiguration(configuration));

        Assert.Contains("Email:Provider", ex.Message);
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
            ["Smtp:Host"] = "",
            ["Smtp:Port"] = "587",
            ["Smtp:UseStartTls"] = "true",
            ["Smtp:Username"] = "",
            ["Smtp:Password"] = "",
            ["Smtp:FromEmail"] = "",
            ["Smtp:FromName"] = "",
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

    private static IConfiguration BuildValidSmtpProductionConfiguration(Dictionary<string, string?>? overrides = null)
    {
        var smtpOverrides = new Dictionary<string, string?>
        {
            ["Email:Provider"] = "Smtp",
            ["Email:From"] = "RateOple <yourgmail@gmail.com>",
            ["Email:FrontendBaseUrl"] = "https://rateople.example.test",
            ["Resend:ApiKey"] = null,
            ["Smtp:Host"] = "smtp.gmail.com",
            ["Smtp:Port"] = "587",
            ["Smtp:UseStartTls"] = "true",
            ["Smtp:Username"] = "yourgmail@gmail.com",
            ["Smtp:Password"] = "abcd efgh ijkl mnop",
            ["Smtp:FromEmail"] = "yourgmail@gmail.com",
            ["Smtp:FromName"] = "RateOple"
        };

        if (overrides is not null)
        {
            foreach (var (key, value) in overrides)
                smtpOverrides[key] = value;
        }

        return BuildValidProductionConfiguration(smtpOverrides);
    }
}
