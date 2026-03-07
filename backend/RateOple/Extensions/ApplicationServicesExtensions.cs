using RateOple.Core.Contracts;
using RateOple.Core.Services;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
        services.AddScoped<ITvSeriesService, TvSeriesService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IRatingService, RatingService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddHttpClient<ITmdbService, TmdbService>();
        services.AddHttpClient<IOpenLibraryService, OpenLibraryService>(); 
        services.AddScoped<ITmdbImportService, TmdbImportService>();
        return services;
    }
}
