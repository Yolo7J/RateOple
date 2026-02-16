using RateOple.Core.Contracts;
using RateOple.Core.Services;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IRatingService, RatingService>();

        return services;
    }
}