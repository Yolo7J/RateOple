using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace RateOple.Infrastructure.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Core security headers
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";

        // NOTE: X-XSS-Protection is deprecated in modern browsers
        // Do NOT use it.

        var csp =
            "default-src 'self'; " +
            "script-src 'self' https://challenges.cloudflare.com; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self'; " +
            "connect-src 'self' ws: wss:; " +
            "frame-src https://challenges.cloudflare.com; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self'; " +
            "frame-ancestors 'none'";

        if (string.Equals(
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Production",
            StringComparison.OrdinalIgnoreCase))
        {
            csp += "; upgrade-insecure-requests";
        }

        headers["Content-Security-Policy"] = csp + ";";

        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["Cross-Origin-Resource-Policy"] = "same-origin";

        if (context.Request.IsHttps)
        {
            headers["Strict-Transport-Security"] =
                "max-age=31536000; includeSubDomains";
        }

        headers.Remove("Server");
        headers.Remove("X-Powered-By");

        await _next(context);
    }
}
