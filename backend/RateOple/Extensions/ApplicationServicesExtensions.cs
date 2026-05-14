using RateOple.Core.Contracts;
using RateOple.Core.Auth.Captcha;
using RateOple.Core.Auth.Interfaces;
using RateOple.Core.Auth.Services;
using RateOple.Core.Collections.Services;
using RateOple.Core.Email;
using RateOple.Core.Groups.Services;
using RateOple.Core.Media.Services;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Moderation.Interfaces;
using RateOple.Core.Social.Services;
using RateOple.Core.Users.Options;
using RateOple.Core.Users.Services;
using RateOple.Notifications;
using RateOple.Services;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.Configure<EmailOptions>(configuration.GetSection("Email"));
        services.Configure<ResendOptions>(configuration.GetSection("Resend"));
        services.Configure<UnconfirmedAccountCleanupOptions>(configuration.GetSection("UnconfirmedAccountCleanup"));
        services.Configure<CaptchaOptions>(configuration.GetSection("Captcha"));

        RegisterEmailSender(services, configuration, environment);
        RegisterCaptchaVerifier(services, configuration, environment);

        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IInteractionService, InteractionService>();
        services.AddScoped<IUserTasteService, UserTasteService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IUserMediaStatusService, UserMediaStatusService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddSingleton<INotificationPublisher, SignalRNotificationPublisher>();
        services.AddScoped<ICollectionService, CollectionService>();
        services.AddScoped<IGroupService, GroupService>();
        services.AddScoped<IModerationService, ModerationService>();
        services.AddScoped<IModerationAuditService, ModerationAuditService>();
        services.AddSingleton<IModerationRealtimePublisher, SignalRModerationRealtimePublisher>();
        services.AddScoped<ITvSeriesService, TvSeriesService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IDiscoveryService, DiscoveryService>();
        services.AddScoped<IRatingService, RatingService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddSingleton<ILoginFailureTracker, InMemoryLoginFailureTracker>();
        services.AddScoped<IAccountEmailService, AccountEmailService>();
        services.AddScoped<ISuspensionAppealService, SuspensionAppealService>();
        services.AddScoped<IUnconfirmedAccountCleanupService, UnconfirmedAccountCleanupService>();
        services.AddHostedService<UnconfirmedAccountCleanupHostedService>();
        services.AddHttpClient<ITmdbService, TmdbService>();
        services.AddHttpClient<IOpenLibraryService, OpenLibraryService>(); 
        services.AddScoped<ITmdbImportService, TmdbImportService>();
        return services;
    }

    private static void RegisterEmailSender(
        IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var provider = configuration["Email:Provider"]?.Trim();
        if (string.Equals(provider, "Resend", StringComparison.OrdinalIgnoreCase))
        {
            if (environment.IsProduction())
                EnsureProductionResendConfiguration(configuration);

            services.AddHttpClient<IAppEmailSender, ResendEmailSender>();
            return;
        }

        if (environment.IsProduction())
            throw new InvalidOperationException("Email:Provider=Resend is required in Production.");

        services.AddSingleton<FakeEmailSender>();
        services.AddSingleton<IAppEmailSender>(sp => sp.GetRequiredService<FakeEmailSender>());
    }

    private static void EnsureProductionResendConfiguration(IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(configuration["Email:From"]))
            throw new InvalidOperationException("Email:From is required in Production.");
        if (string.IsNullOrWhiteSpace(configuration["Email:FrontendBaseUrl"]))
            throw new InvalidOperationException("Email:FrontendBaseUrl is required in Production.");
        if (string.IsNullOrWhiteSpace(configuration["Resend:ApiKey"]))
            throw new InvalidOperationException("Resend:ApiKey is required in Production.");
    }

    private static void RegisterCaptchaVerifier(
        IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var enabled = configuration.GetValue<bool>("Captcha:Enabled");
        var provider = configuration["Captcha:Provider"]?.Trim();
        if (string.IsNullOrWhiteSpace(provider))
            provider = "Turnstile";

        if (!enabled)
        {
            if (environment.IsProduction())
                throw new InvalidOperationException("Captcha:Enabled=true is required in Production.");
            if (!string.Equals(provider, "Noop", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Captcha:Provider=Noop is required when CAPTCHA is disabled.");

            services.AddSingleton<ICaptchaVerifier, NoopCaptchaVerifier>();
            return;
        }

        if (string.Equals(provider, "Turnstile", StringComparison.OrdinalIgnoreCase))
        {
            EnsureTurnstileConfiguration(configuration);
            services.AddHttpClient<ICaptchaVerifier, TurnstileCaptchaVerifier>();
            return;
        }

        if (string.Equals(provider, "Fake", StringComparison.OrdinalIgnoreCase))
        {
            if (environment.IsProduction())
                throw new InvalidOperationException("Captcha:Provider=Fake is not allowed in Production.");

            services.AddSingleton<FakeCaptchaVerifier>();
            services.AddSingleton<ICaptchaVerifier>(sp => sp.GetRequiredService<FakeCaptchaVerifier>());
            return;
        }

        if (string.Equals(provider, "Noop", StringComparison.OrdinalIgnoreCase))
        {
            if (environment.IsProduction())
                throw new InvalidOperationException("Captcha:Provider=Noop is not allowed in Production.");

            services.AddSingleton<ICaptchaVerifier, NoopCaptchaVerifier>();
            return;
        }

        throw new InvalidOperationException($"Unsupported Captcha:Provider '{provider}'.");
    }

    private static void EnsureTurnstileConfiguration(IConfiguration configuration)
    {
        if (string.IsNullOrWhiteSpace(configuration["Captcha:SiteKey"]))
            throw new InvalidOperationException("Captcha:SiteKey is required when Turnstile CAPTCHA is enabled.");
        if (string.IsNullOrWhiteSpace(configuration["Captcha:SecretKey"]))
            throw new InvalidOperationException("Captcha:SecretKey is required when Turnstile CAPTCHA is enabled.");
        if (string.IsNullOrWhiteSpace(configuration["Captcha:VerifyUrl"]))
            throw new InvalidOperationException("Captcha:VerifyUrl is required when Turnstile CAPTCHA is enabled.");
    }
}
