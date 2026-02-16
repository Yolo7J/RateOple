namespace RateOple.Extensions;

public static class ApiExtensions
{
    public static IServiceCollection AddApi(this IServiceCollection services)
    {
        services.AddControllers();
        services.AddOpenApi();
        
        return services;
    }
}