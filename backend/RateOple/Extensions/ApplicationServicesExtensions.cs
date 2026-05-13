using RateOple.Core.Contracts;
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

        RegisterEmailSender(services, configuration, environment);

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
}
