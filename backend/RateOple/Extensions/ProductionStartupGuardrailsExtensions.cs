using System.Text;
using RateOple.Infrastructure.Data.Seeding;

namespace RateOple.Extensions;

public static class ProductionStartupGuardrailsExtensions
{
    private static readonly string[] WeakJwtFragments =
    [
        "changethis",
        "developmentonly",
        "replace",
        "testingonly",
        "password",
        "secret"
    ];

    public static WebApplicationBuilder ValidateProductionStartupConfiguration(this WebApplicationBuilder builder)
    {
        if (builder.Environment.IsProduction())
            ValidateProductionConfiguration(builder.Configuration);

        return builder;
    }

    public static void ValidateProductionConfiguration(IConfiguration configuration)
    {
        Require("ConnectionStrings:DefaultConnection", configuration.GetConnectionString("DefaultConnection"));
        ValidateJwt(configuration);
        ValidatePublicOrigin(configuration);
        ValidateGoogle(configuration);
        ValidateEmail(configuration);
        Require("Tmdb:ReadAccessToken", configuration["Tmdb:ReadAccessToken"]);
        ValidateCaptcha(configuration);

        var seedOptions = configuration.GetSection("Seed").Get<SeedOptions>() ?? new SeedOptions();
        SeedOptionsValidator.Validate(seedOptions, isDevelopment: false);
    }

    private static void ValidateJwt(IConfiguration configuration)
    {
        var key = Require("Jwt:Key", configuration["Jwt:Key"]);
        if (Encoding.UTF8.GetByteCount(key) < 32 || ContainsWeakFragment(key))
            throw new InvalidOperationException("Jwt:Key is required in Production and must be a strong non-placeholder value of at least 32 bytes.");

        Require("Jwt:Issuer", configuration["Jwt:Issuer"]);
        Require("Jwt:Audience", configuration["Jwt:Audience"]);
    }

    private static void ValidatePublicOrigin(IConfiguration configuration)
    {
        var publicOrigin = FirstConfigured(configuration["App:PublicOrigin"], configuration["Email:FrontendBaseUrl"]);
        if (string.IsNullOrWhiteSpace(publicOrigin))
            throw new InvalidOperationException("App:PublicOrigin or Email:FrontendBaseUrl is required in Production.");

        if (!Uri.TryCreate(publicOrigin, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
            || uri.IsLoopback)
        {
            throw new InvalidOperationException("The production public origin must be an absolute HTTPS origin and cannot be localhost.");
        }
    }

    private static void ValidateGoogle(IConfiguration configuration)
    {
        Require("Authentication:Google:ClientId", configuration["Authentication:Google:ClientId"]);
        Require("Authentication:Google:ClientSecret", configuration["Authentication:Google:ClientSecret"]);
    }

    private static void ValidateEmail(IConfiguration configuration)
    {
        var provider = Require("Email:Provider", configuration["Email:Provider"]);
        if (!string.Equals(provider, "Resend", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Email:Provider=Resend is required in Production.");

        Require("Email:From", configuration["Email:From"]);
        Require("Resend:ApiKey", configuration["Resend:ApiKey"]);
    }

    private static void ValidateCaptcha(IConfiguration configuration)
    {
        var provider = Require("Captcha:Provider", configuration["Captcha:Provider"]);
        if (!configuration.GetValue<bool>("Captcha:Enabled"))
            throw new InvalidOperationException("Captcha:Enabled=true is required in Production.");

        if (!string.Equals(provider, "Turnstile", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Captcha:Provider=Turnstile is required in Production.");

        Require("Captcha:SiteKey", configuration["Captcha:SiteKey"]);
        Require("Captcha:SecretKey", configuration["Captcha:SecretKey"]);
        var verifyUrl = Require("Captcha:VerifyUrl", configuration["Captcha:VerifyUrl"]);
        if (!Uri.TryCreate(verifyUrl, UriKind.Absolute, out var uri)
            || !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Captcha:VerifyUrl must be an absolute HTTPS URL in Production.");
        }
    }

    private static string Require(string key, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new InvalidOperationException($"{key} is required in Production.");

        return value.Trim();
    }

    private static string? FirstConfigured(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static bool ContainsWeakFragment(string value)
    {
        return WeakJwtFragments.Any(fragment => value.Contains(fragment, StringComparison.OrdinalIgnoreCase));
    }
}
