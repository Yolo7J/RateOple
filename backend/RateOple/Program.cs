using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Models;
using RateOple.Infrastructure.Data.Seeding;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Core.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================
// SERVICE REGISTRATION (Before app.Build())
// ============================================

// Database Context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity
builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Authorization Policies
builder.Services.AddAuthorization(options =>
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

// Application Services
builder.Services.AddScoped<IFollowService, FollowService>();
builder.Services.AddScoped<IVisibilityService, VisibilityService>();
builder.Services.AddScoped<IMediaService, MediaService>();

// Controllers & API
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS (configure as needed)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Vite default port
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ============================================
// BUILD APPLICATION
// ============================================

var app = builder.Build();

// ============================================
// SEEDING (After app.Build(), Before Middleware)
// ============================================

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    
    try
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = services.GetRequiredService<UserManager<User>>();

        await RoleSeeder.SeedAsync(roleManager);
        await SuperAdminSeeder.SeedAsync(userManager);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Example endpoint (can be removed later)
var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
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

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
