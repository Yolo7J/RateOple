using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using RateOple.Hubs;
using RateOple.Infrastructure.Middleware;

namespace RateOple.Extensions;

public static class MiddlewareExtensions
{
    public static void ConfigureMiddleware(this WebApplication app, IWebHostEnvironment env)
    {
        if (env.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();
        app.UseExceptionHandler();
        app.UseSecurityHeaders();
        app.UseDefaultFiles();
        app.UseStaticFiles();

        if (env.IsDevelopment())
        {
            app.UseCors("AllowFrontend");
        }

        app.UseRouting();
        app.UseAuthentication();

        // Redistribution of your manual Antiforgery logic
        app.Use(async (context, next) =>
{
    var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
    var methods = new[] { "POST", "PUT", "DELETE", "PATCH" };
    var endpoint = context.GetEndpoint();
    var hasIgnore = endpoint?.Metadata
        .GetMetadata<IgnoreAntiforgeryTokenAttribute>() != null;
    var isHubRequest = context.Request.Path.StartsWithSegments("/hubs");

    if (methods.Contains(context.Request.Method) && !hasIgnore && !isHubRequest)
    {
        try
        {
            await antiforgery.ValidateRequestAsync(context);
        }
        catch (AntiforgeryValidationException)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "A valid CSRF token is required for this request."
            });
            return;
        }
    }
    await next();
});

        app.UseAuthorization();
        app.MapControllers();
        // SignalR negotiate/connect requests are not normal form/API mutations and
        // cannot reliably carry the antiforgery header through every transport.
        app.MapHub<NotificationHub>("/hubs/notifications")
            .WithMetadata(new IgnoreAntiforgeryTokenAttribute());

        app.MapFallback(async context =>
        {
            if (IsReservedBackendPath(context.Request.Path))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            var indexPath = Path.Combine(app.Environment.WebRootPath ?? "wwwroot", "index.html");
            if (!File.Exists(indexPath))
            {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(indexPath);
        });
    }

    private static bool IsReservedBackendPath(PathString path)
    {
        return path.StartsWithSegments("/api")
            || path.StartsWithSegments("/hubs")
            || path.StartsWithSegments("/swagger")
            || path.StartsWithSegments("/openapi");
    }
}
