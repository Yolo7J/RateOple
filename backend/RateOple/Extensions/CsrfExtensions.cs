namespace RateOple.Extensions;

public static class CsrfExtensions
{
    public static IServiceCollection AddCsrfProtection(this IServiceCollection services)
    {
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "X-CSRF-COOKIE";
            options.Cookie.HttpOnly = false;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
        });

        return services;
    }
}