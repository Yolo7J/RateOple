using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Quotas;

namespace RateOple.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(
        IProblemDetailsService problemDetailsService,
        IHostEnvironment environment,
        ILogger<GlobalExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _environment = environment;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problem = CreateProblemDetails(httpContext, exception);

        if (problem.Status >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception while processing {Method} {Path}.",
                httpContext.Request.Method,
                httpContext.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Handled exception while processing {Method} {Path}.",
                httpContext.Request.Method,
                httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/problem+json";

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }

    private ProblemDetails CreateProblemDetails(HttpContext httpContext, Exception exception)
    {
        var status = GetStatusCode(exception);
        var title = GetTitle(status);
        var detail = GetDetail(exception, status);

        var problem = new ProblemDetails
        {
            Type = $"https://httpstatuses.com/{status}",
            Title = title,
            Status = status,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        problem.Extensions["traceId"] = httpContext.TraceIdentifier;
        problem.Extensions["message"] = detail;
        if (exception is QuotaExceededException quotaException)
            problem.Extensions["code"] = quotaException.Code;

        return problem;
    }

    private int GetStatusCode(Exception exception)
    {
        return exception switch
        {
            QuotaExceededException quotaException => quotaException.StatusCode,
            ValidationException => StatusCodes.Status400BadRequest,
            ArgumentException => StatusCodes.Status400BadRequest,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            UnauthorizedAccessException => StatusCodes.Status403Forbidden,
            InvalidOperationException invalidOperation => IsConflict(invalidOperation)
                ? StatusCodes.Status409Conflict
                : StatusCodes.Status400BadRequest,
            _ => StatusCodes.Status500InternalServerError
        };
    }

    private static string GetTitle(int status)
    {
        return status switch
        {
            StatusCodes.Status400BadRequest => "Bad Request",
            StatusCodes.Status403Forbidden => "Forbidden",
            StatusCodes.Status404NotFound => "Not Found",
            StatusCodes.Status409Conflict => "Conflict",
            _ => "Internal Server Error"
        };
    }

    private string GetDetail(Exception exception, int status)
    {
        if (status >= StatusCodes.Status500InternalServerError)
        {
            return _environment.IsDevelopment()
                ? exception.Message
                : "An unexpected server error occurred.";
        }

        return string.IsNullOrWhiteSpace(exception.Message)
            ? GetTitle(status)
            : exception.Message;
    }

    private static bool IsConflict(InvalidOperationException exception)
    {
        var message = exception.Message;
        return message.Contains("already", StringComparison.OrdinalIgnoreCase)
            || message.Contains("duplicate", StringComparison.OrdinalIgnoreCase)
            || message.Contains("conflict", StringComparison.OrdinalIgnoreCase)
            || message.Contains("in use", StringComparison.OrdinalIgnoreCase);
    }
}
