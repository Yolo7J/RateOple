using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RateOple.Core.Quotas;

namespace RateOple.Extensions;

public static class RateLimitingExtensions
{
    private const string RateLimitEmailItemKey = "RateOple.RateLimit.Email";

    public static IServiceCollection AddRateOpleRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<UserQuotaOptions>(configuration.GetSection("UserQuotas"));
        services.AddScoped<IUserQuotaService, UserQuotaService>();
        services.ConfigureForwardedHeaders(configuration);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ResolvePartition);
            options.OnRejected = WriteRateLimitProblemAsync;
        });

        return services;
    }

    public static IApplicationBuilder UseRateOpleRateLimitingMetadata(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            if (ShouldReadEmailFromBody(context.Request))
                await CaptureEmailAsync(context);

            await next();
        });
    }

    private static RateLimitPartition<string> ResolvePartition(HttpContext context)
    {
        var request = context.Request;
        var method = request.Method;
        var path = request.Path;

        if (HttpMethods.IsPost(method) && path.Equals("/api/auth/register", StringComparison.OrdinalIgnoreCase))
        {
            var key = $"auth-register:{GetClientIp(context)}:{GetBodyEmail(context) ?? "unknown"}";
            return CompositePartition(
                key,
                Sliding(3, TimeSpan.FromHours(1)),
                Fixed(10, TimeSpan.FromDays(1)));
        }

        if (HttpMethods.IsPost(method) && path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase))
        {
            var key = $"auth-login-ip:{GetClientIp(context)}";
            return CompositePartition(key, Sliding(20, TimeSpan.FromMinutes(15)));
        }

        if (HttpMethods.IsPost(method) && path.Equals("/api/auth/refresh", StringComparison.OrdinalIgnoreCase))
        {
            var key = $"auth-refresh:{GetUserOrSessionOrIp(context)}";
            return CompositePartition(key, Sliding(60, TimeSpan.FromMinutes(15)));
        }

        if (HttpMethods.IsPost(method) &&
            (path.Equals("/api/auth/resend-confirmation", StringComparison.OrdinalIgnoreCase) ||
             path.Equals("/api/auth/forgot-password", StringComparison.OrdinalIgnoreCase)))
        {
            var key = $"email-send:{GetUserOrEmailAndIp(context)}";
            return CompositePartition(
                key,
                Sliding(3, TimeSpan.FromMinutes(15)),
                Fixed(10, TimeSpan.FromDays(1)));
        }

        if (HttpMethods.IsGet(method) && IsLookupSearch(path))
        {
            var key = $"lookup:{GetUserId(context) ?? GetClientIp(context)}";
            return CompositePartition(key, Sliding(120, TimeSpan.FromMinutes(1)));
        }

        if (IsAdminMutation(request))
        {
            var key = $"admin-mutation:{GetUserId(context) ?? GetClientIp(context)}";
            return CompositePartition(key, Sliding(120, TimeSpan.FromMinutes(15)));
        }

        if (IsUgcWrite(request))
        {
            var key = $"ugc-write:{GetUserId(context) ?? GetClientIp(context)}";
            return CompositePartition(
                key,
                Sliding(30, TimeSpan.FromMinutes(5)),
                Fixed(300, TimeSpan.FromDays(1)));
        }

        return RateLimitPartition.GetNoLimiter("unlimited");
    }

    private static RateLimitPartition<string> CompositePartition(
        string key,
        params Func<RateLimiter>[] limiterFactories)
    {
        return RateLimitPartition.Get(key, _ => new CompositeRateLimiter(limiterFactories.Select(factory => factory()).ToArray()));
    }

    private static Func<RateLimiter> Sliding(int permitLimit, TimeSpan window)
    {
        return () => new SlidingWindowRateLimiter(new SlidingWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            SegmentsPerWindow = Math.Min(permitLimit, 6),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    }

    private static Func<RateLimiter> Fixed(int permitLimit, TimeSpan window)
    {
        return () => new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            QueueLimit = 0,
            AutoReplenishment = true
        });
    }

    private static ValueTask WriteRateLimitProblemAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var httpContext = context.HttpContext;
        var retryAfter = GetRetryAfter(context.Lease) ?? TimeSpan.FromSeconds(60);
        httpContext.Response.Headers.RetryAfter = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds))
            .ToString(CultureInfo.InvariantCulture);

        var detail = $"Too many requests. Try again in {Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds))} seconds.";

        var problem = new ProblemDetails
        {
            Type = "https://httpstatuses.com/429",
            Title = "Too Many Requests",
            Status = StatusCodes.Status429TooManyRequests,
            Detail = detail,
            Instance = httpContext.Request.Path
        };
        problem.Extensions["code"] = "rate_limit_exceeded";
        problem.Extensions["message"] = detail;
        problem.Extensions["traceId"] = httpContext.TraceIdentifier;

        httpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        httpContext.Response.ContentType = "application/problem+json";
        return new ValueTask(httpContext.Response.WriteAsJsonAsync(problem, cancellationToken));
    }

    private static TimeSpan? GetRetryAfter(RateLimitLease lease)
    {
        return lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
            ? retryAfter
            : null;
    }

    private static bool ShouldReadEmailFromBody(HttpRequest request)
    {
        if (!HttpMethods.IsPost(request.Method))
            return false;

        return request.Path.Equals("/api/auth/register", StringComparison.OrdinalIgnoreCase)
            || request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase)
            || request.Path.Equals("/api/auth/resend-confirmation", StringComparison.OrdinalIgnoreCase)
            || request.Path.Equals("/api/auth/forgot-password", StringComparison.OrdinalIgnoreCase);
    }

    private static async Task CaptureEmailAsync(HttpContext context)
    {
        context.Request.EnableBuffering(bufferThreshold: 1024 * 8, bufferLimit: 1024 * 32);

        try
        {
            var document = await JsonDocument.ParseAsync(context.Request.Body, cancellationToken: context.RequestAborted);
            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("email", out var emailElement) &&
                emailElement.ValueKind == JsonValueKind.String)
            {
                var email = emailElement.GetString();
                if (!string.IsNullOrWhiteSpace(email))
                    context.Items[RateLimitEmailItemKey] = email.Trim().ToUpperInvariant();
            }
        }
        catch (JsonException)
        {
            // Let normal model binding and validation own malformed request bodies.
        }
        finally
        {
            context.Request.Body.Position = 0;
        }
    }

    private static string? GetBodyEmail(HttpContext context)
    {
        return context.Items.TryGetValue(RateLimitEmailItemKey, out var value)
            ? value as string
            : null;
    }

    private static string GetUserOrEmailAndIp(HttpContext context)
    {
        var userId = GetUserId(context);
        if (!string.IsNullOrWhiteSpace(userId))
            return $"user:{userId}:{GetClientIp(context)}";

        return $"email:{GetBodyEmail(context) ?? "unknown"}:{GetClientIp(context)}";
    }

    private static string GetUserOrSessionOrIp(HttpContext context)
    {
        var userId = GetUserId(context);
        if (!string.IsNullOrWhiteSpace(userId))
            return $"user:{userId}";

        if (context.Request.Cookies.TryGetValue("refreshToken", out var refreshToken) &&
            !string.IsNullOrWhiteSpace(refreshToken))
            return $"session:{HashForPartition(refreshToken)}:{GetClientIp(context)}";

        return $"ip:{GetClientIp(context)}";
    }

    private static string? GetUserId(HttpContext context)
    {
        return context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private static string GetClientIp(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string HashForPartition(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash.AsSpan(0, 8));
    }

    private static bool IsLookupSearch(PathString path)
    {
        var value = path.Value ?? string.Empty;
        return value.EndsWith("/lookup", StringComparison.OrdinalIgnoreCase)
            || value.Contains("/lookup/", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/media/lookup", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/users/lookup", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/groups/lookup", StringComparison.OrdinalIgnoreCase)
            || value.Equals("/api/collections/lookup", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAdminMutation(HttpRequest request)
    {
        if (!IsMutating(request.Method))
            return false;

        var path = request.Path.Value ?? string.Empty;
        return path.StartsWith("/api/admin/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/tmdb/import-series/", StringComparison.OrdinalIgnoreCase)
            || IsAdminMediaMutation(path)
            || IsModerationStaffMutation(path)
            || IsSuspensionAppealResolve(path);
    }

    private static bool IsAdminMediaMutation(string path)
    {
        if (!path.StartsWith("/api/media/", StringComparison.OrdinalIgnoreCase))
            return false;

        return path.Equals("/api/media/movies", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/api/media/books", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/api/media/tvseries", StringComparison.OrdinalIgnoreCase)
            || path.Equals("/api/media/bulk", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/tags", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/seasons", StringComparison.OrdinalIgnoreCase)
            || !path.EndsWith("/status", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsModerationStaffMutation(string path)
    {
        return path.StartsWith("/api/moderation/assignments", StringComparison.OrdinalIgnoreCase)
            || (path.StartsWith("/api/moderation/reports/", StringComparison.OrdinalIgnoreCase) &&
                (path.EndsWith("/status", StringComparison.OrdinalIgnoreCase) ||
                 path.EndsWith("/target", StringComparison.OrdinalIgnoreCase)));
    }

    private static bool IsSuspensionAppealResolve(string path)
    {
        return path.StartsWith("/api/suspension-appeals/", StringComparison.OrdinalIgnoreCase)
            && path.EndsWith("/resolve", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsUgcWrite(HttpRequest request)
    {
        if (!IsMutating(request.Method))
            return false;

        var path = request.Path.Value ?? string.Empty;
        return path.StartsWith("/api/collections", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/groups", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/reviews", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/follows", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/moderation/reports", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/suspension-appeals", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/ratings", StringComparison.OrdinalIgnoreCase)
            || (path.StartsWith("/api/media/", StringComparison.OrdinalIgnoreCase) &&
                path.EndsWith("/status", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsMutating(string method)
    {
        return HttpMethods.IsPost(method)
            || HttpMethods.IsPut(method)
            || HttpMethods.IsPatch(method)
            || HttpMethods.IsDelete(method);
    }

    private static void ConfigureForwardedHeaders(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

            foreach (var proxy in configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
            {
                if (IPAddress.TryParse(proxy, out var address))
                    options.KnownProxies.Add(address);
            }
        });
    }

    private sealed class CompositeRateLimiter : RateLimiter
    {
        private readonly IReadOnlyList<RateLimiter> _limiters;

        public CompositeRateLimiter(IReadOnlyList<RateLimiter> limiters)
        {
            _limiters = limiters;
        }

        public override TimeSpan? IdleDuration => _limiters
            .Select(limiter => limiter.IdleDuration)
            .Where(duration => duration.HasValue)
            .Max();

        public override RateLimiterStatistics? GetStatistics()
        {
            return null;
        }

        protected override RateLimitLease AttemptAcquireCore(int permitCount)
        {
            var leases = new List<RateLimitLease>(_limiters.Count);
            foreach (var limiter in _limiters)
            {
                var lease = limiter.AttemptAcquire(permitCount);
                leases.Add(lease);
                if (!lease.IsAcquired)
                    return new CompositeRateLimitLease(false, leases, lease);
            }

            return new CompositeRateLimitLease(true, leases, null);
        }

        protected override async ValueTask<RateLimitLease> AcquireAsyncCore(
            int permitCount,
            CancellationToken cancellationToken)
        {
            var leases = new List<RateLimitLease>(_limiters.Count);
            foreach (var limiter in _limiters)
            {
                var lease = await limiter.AcquireAsync(permitCount, cancellationToken);
                leases.Add(lease);
                if (!lease.IsAcquired)
                    return new CompositeRateLimitLease(false, leases, lease);
            }

            return new CompositeRateLimitLease(true, leases, null);
        }

        protected override void Dispose(bool disposing)
        {
            if (!disposing)
                return;

            foreach (var limiter in _limiters)
                limiter.Dispose();
        }

        protected override async ValueTask DisposeAsyncCore()
        {
            foreach (var limiter in _limiters)
                await limiter.DisposeAsync();
        }
    }

    private sealed class CompositeRateLimitLease : RateLimitLease
    {
        private readonly IReadOnlyList<RateLimitLease> _leases;
        private readonly RateLimitLease? _failedLease;

        public CompositeRateLimitLease(bool isAcquired, IReadOnlyList<RateLimitLease> leases, RateLimitLease? failedLease)
        {
            IsAcquired = isAcquired;
            _leases = leases;
            _failedLease = failedLease;
        }

        public override bool IsAcquired { get; }

        public override IEnumerable<string> MetadataNames => _leases.SelectMany(lease => lease.MetadataNames).Distinct();

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (_failedLease != null && _failedLease.TryGetMetadata(metadataName, out metadata))
                return true;

            foreach (var lease in _leases)
            {
                if (lease.TryGetMetadata(metadataName, out metadata))
                    return true;
            }

            metadata = null;
            return false;
        }

        protected override void Dispose(bool disposing)
        {
            if (!disposing)
                return;

            foreach (var lease in _leases)
                lease.Dispose();
        }
    }
}
