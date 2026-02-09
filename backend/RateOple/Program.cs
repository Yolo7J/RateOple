using Microsoft.AspNetCore.Identity;
using RateOple.Infrastructure.Data.Models;
using RateOple.Infrastructure.Data.Seeding;
using RateOple.Constants.Constants;
using RateOple.Core.Contarcts;
using RateOple.Core.Services;
using RateOple.Core.Contracts;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

using (var scope = app.Services.CreateScope()) // Roles
{
    var services = scope.ServiceProvider;

    var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    var userManager = services.GetRequiredService<UserManager<User>>();

    await RoleSeeder.SeedAsync(roleManager);
    await SuperAdminSeeder.SeedAsync(userManager);
}

builder.Services.AddAuthorization(options => // Authorization Policy
{
    options.AddPolicy(PolicyConstants.RequireAdmin, policy =>
        policy.RequireRole(
            RoleConstants.Admin,
            RoleConstants.SuperAdmin));

    options.AddPolicy(PolicyConstants.RequireModerator, policy =>
        policy.RequireRole(
            RoleConstants.Moderator,
            RoleConstants.Admin,
            RoleConstants.SuperAdmin));

    options.AddPolicy(PolicyConstants.CanModerateContent, policy =>
        policy.RequireRole(
            RoleConstants.Moderator,
            RoleConstants.Admin,
            RoleConstants.SuperAdmin));

    options.AddPolicy(PolicyConstants.CanManageGroups, policy =>
        policy.RequireRole(
            RoleConstants.Admin,
            RoleConstants.SuperAdmin));
});

builder.Services.AddScoped<IFollowService, FollowService>(); // Followers
builder.Services.AddScoped<IVisibilityService, VisibilityService>(); // Visibility
builder.Services.AddScoped<IMediaService, MediaService>(); // Media

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
