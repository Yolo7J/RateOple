namespace RateOple.Extensions;

public static class CorsExtensions
{
    public static readonly string[] DevelopmentFrontendOrigins =
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    };

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                // Development-only CORS. Production browser traffic should be same-origin:
                // ASP.NET Core serves the compiled frontend from wwwroot and the API from /api.
                policy.WithOrigins(DevelopmentFrontendOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });

        return services;
    }
}
