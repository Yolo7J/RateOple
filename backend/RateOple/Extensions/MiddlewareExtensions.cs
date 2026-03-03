using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
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
        app.UseSecurityHeaders();
        app.UseCors("AllowFrontend");
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

    if (methods.Contains(context.Request.Method) && !hasIgnore)
    {
        await antiforgery.ValidateRequestAsync(context);
    }
    await next();
});

        app.UseAuthorization();
        app.MapControllers();
    }
}