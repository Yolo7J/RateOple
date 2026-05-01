using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using System.Globalization;

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
                options.Events.OnRemoteFailure = context =>
                {
                    var returnUrl = context.Request.Query["returnUrl"].ToString();
                    var redirectUrl = BuildExternalLoginRedirect(context.Request, returnUrl, "remote_failure");

                    context.Response.Redirect(redirectUrl);
                    context.HandleResponse();

                    return Task.CompletedTask;
                };
            });

        return services;
    }

    private static string BuildExternalLoginRedirect(HttpRequest request, string? returnUrl, string error)
    {
        var target = ResolveAllowedExternalLoginReturnUrl(request, returnUrl);
        var separator = target.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return string.Create(
            CultureInfo.InvariantCulture,
            $"{target}{separator}externalLogin=failed&error={Uri.EscapeDataString(error)}");
    }

    private static string ResolveAllowedExternalLoginReturnUrl(HttpRequest request, string? returnUrl)
    {
        if (IsSafeLocalPath(returnUrl))
            return returnUrl!;

        if (string.IsNullOrWhiteSpace(returnUrl))
            return "/";

        if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var absoluteUri))
            return "/";

        if (!string.Equals(absoluteUri.AbsolutePath, "/auth/callback", StringComparison.Ordinal))
            return "/";

        if (!IsAllowedFrontendOrigin(request, absoluteUri))
            return "/";

        return absoluteUri.GetLeftPart(UriPartial.Path) + absoluteUri.Query;
    }

    private static bool IsAllowedFrontendOrigin(HttpRequest request, Uri absoluteUri)
    {
        var requestOrigin = $"{request.Scheme}://{request.Host}";
        var candidateOrigin = absoluteUri.GetLeftPart(UriPartial.Authority);

        if (string.Equals(candidateOrigin, requestOrigin, StringComparison.OrdinalIgnoreCase))
            return true;

        return CorsExtensions.DevelopmentFrontendOrigins.Contains(candidateOrigin, StringComparer.OrdinalIgnoreCase);
    }

    private static bool IsSafeLocalPath(string? value)
    {
        return !string.IsNullOrWhiteSpace(value)
            && value.StartsWith("/", StringComparison.Ordinal)
            && !value.StartsWith("//", StringComparison.Ordinal);
    }
}
