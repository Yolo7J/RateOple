using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RateOple.Hubs;
using RateOple.Middleware;

namespace RateOple.Extensions;

public static class ApiExtensions
{
    public static IServiceCollection AddApi(this IServiceCollection services)
    {
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
            {
                context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
                context.ProblemDetails.Extensions["message"] =
                    context.ProblemDetails.Detail ?? context.ProblemDetails.Title;
            };
        });
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddControllers()
            .ConfigureApiBehaviorOptions(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var problem = new ValidationProblemDetails(context.ModelState)
                    {
                        Type = "https://httpstatuses.com/400",
                        Title = "Validation failed.",
                        Status = StatusCodes.Status400BadRequest,
                        Detail = "One or more validation errors occurred.",
                        Instance = context.HttpContext.Request.Path
                    };
                    problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
                    problem.Extensions["message"] = problem.Detail;

                    return new BadRequestObjectResult(problem)
                    {
                        ContentTypes = { "application/problem+json" }
                    };
                };
            });
        services.AddOpenApi();
        services.AddSignalR();
        services.AddSingleton<IUserIdProvider, NameIdentifierUserIdProvider>();
        
        return services;
    }
}
