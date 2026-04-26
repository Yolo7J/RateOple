using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;

namespace RateOple.Extensions;

public static class GoogleAuthenticationExtensions
{
    public static IServiceCollection AddGoogleAuthenticationIfConfigured(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var clientId = configuration["Authentication:Google:ClientId"];
        var clientSecret = configuration["Authentication:Google:ClientSecret"];

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            return services;

        services.AddAuthentication()
            .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
            {
                options.ClientId = clientId;
                options.ClientSecret = clientSecret;
                options.SignInScheme = IdentityConstants.ExternalScheme;
                options.CallbackPath = "/api/auth/google/callback";
                options.SaveTokens = false;
            });

        return services;
    }
}
