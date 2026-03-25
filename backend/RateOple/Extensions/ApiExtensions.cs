using Microsoft.AspNetCore.SignalR;
using RateOple.Hubs;

namespace RateOple.Extensions;

public static class ApiExtensions
{
    public static IServiceCollection AddApi(this IServiceCollection services)
    {
        services.AddControllers();
        services.AddOpenApi();
        services.AddSignalR();
        services.AddSingleton<IUserIdProvider, NameIdentifierUserIdProvider>();
        
        return services;
    }
}
