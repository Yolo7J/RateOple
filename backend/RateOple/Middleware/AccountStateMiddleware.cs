using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Infrastructure.Data;

namespace RateOple.Middleware;

public sealed class AccountStateMiddleware
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    };

    private readonly RequestDelegate _next;

    public AccountStateMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db, IProblemDetailsService problemDetailsService)
    {
        if (!ShouldInspect(context))
        {
            await _next(context);
            return;
        }

        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
        {
            await _next(context);
            return;
        }

        var user = await db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.EmailConfirmed, u.IsSuspended, u.IsDeleted })
            .FirstOrDefaultAsync(context.RequestAborted);

        if (user == null)
        {
            await _next(context);
            return;
        }

        if (user.IsDeleted)
        {
            await WriteForbiddenAsync(
                context,
                problemDetailsService,
                "account_deleted",
                "This account has been deleted.");
            return;
        }

        if (user.IsSuspended && !IsSuspensionAppealCreate(context.Request))
        {
            await WriteForbiddenAsync(
                context,
                problemDetailsService,
                "account_suspended",
                "Your account is suspended. You can browse read-only and submit suspension appeals.");
            return;
        }

        if (!user.EmailConfirmed && IsUserGeneratedMutation(context.Request))
        {
            await WriteForbiddenAsync(
                context,
                problemDetailsService,
                "email_not_confirmed",
                "Please confirm your email before creating or changing content.");
            return;
        }

        await _next(context);
    }

    private static bool ShouldInspect(HttpContext context)
    {
        return context.User.Identity?.IsAuthenticated == true
            && MutatingMethods.Contains(context.Request.Method)
            && context.Request.Path.StartsWithSegments("/api");
    }

    private static bool IsSuspensionAppealCreate(HttpRequest request)
    {
        return HttpMethods.IsPost(request.Method)
            && request.Path.Equals("/api/suspension-appeals", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsUserGeneratedMutation(HttpRequest request)
    {
        var path = request.Path.Value ?? string.Empty;
        return path.StartsWith("/api/collections", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/groups", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/reviews", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/follows", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/moderation/reports", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/suspension-appeals", StringComparison.OrdinalIgnoreCase)
            || IsRatingMutation(path)
            || IsMediaStatusMutation(path);
    }

    private static bool IsRatingMutation(string path)
    {
        return path.Contains("/ratings", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMediaStatusMutation(string path)
    {
        return path.StartsWith("/api/media/", StringComparison.OrdinalIgnoreCase)
            && path.EndsWith("/status", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task WriteForbiddenAsync(
        HttpContext context,
        IProblemDetailsService problemDetailsService,
        string code,
        string detail)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Type = "https://httpstatuses.com/403",
            Title = "Forbidden",
            Status = StatusCodes.Status403Forbidden,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["code"] = code;
        problem.Extensions["message"] = detail;
        problem.Extensions["traceId"] = context.TraceIdentifier;

        await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem
        });
    }
}
