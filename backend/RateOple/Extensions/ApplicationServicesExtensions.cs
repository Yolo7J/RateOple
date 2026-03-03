using RateOple.Core.Contracts;
using RateOple.Core.Services;
using RateOple.Infrastructure.Security;

namespace RateOple.Extensions;

public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IFollowService, FollowService>();
        services.AddScoped<IVisibilityService, VisibilityService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IRatingService, RatingService>();
        services.AddScoped<IJwtService, JwtService>();
        return services;
    }
}