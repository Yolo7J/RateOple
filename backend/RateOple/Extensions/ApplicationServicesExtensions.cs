using RateOple.Core.Contracts;
using RateOple.Core.Auth.Services;
using RateOple.Core.Collections.Services;
using RateOple.Core.Groups.Services;
using RateOple.Core.Media.Services;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Social.Services;
using RateOple.Core.Users.Services;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IInteractionService, InteractionService>();
        services.AddScoped<IUserTasteService, UserTasteService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
        services.AddScoped<IUserProfileService, UserProfileService>();
        services.AddScoped<IUserMediaStatusService, UserMediaStatusService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddSingleton<INotificationPublisher, NoopNotificationPublisher>();
        services.AddScoped<ICollectionService, CollectionService>();
        services.AddScoped<IGroupService, GroupService>();
        services.AddScoped<IModerationService, ModerationService>();
        services.AddScoped<ITvSeriesService, TvSeriesService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IDiscoveryService, DiscoveryService>();
        services.AddScoped<IRatingService, RatingService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddHttpClient<ITmdbService, TmdbService>();
        services.AddHttpClient<IOpenLibraryService, OpenLibraryService>(); 
        services.AddScoped<ITmdbImportService, TmdbImportService>();
        return services;
    }
}
