using RateOple.Core.Contracts;
using RateOple.Core.Services;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IInteractionService, InteractionService>();
        services.AddScoped<IUserTasteService, UserTasteService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
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
