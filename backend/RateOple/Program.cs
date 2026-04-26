using RateOple.Extensions;
using RateOple.Infrastructure.Data.Seeding;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection("Seed"));

builder.Services
    .AddDatabase(builder.Configuration)
    .AddIdentityConfiguration()
    .AddAuthorizationPolicies()
    .AddJwtAuthentication(builder.Configuration, builder.Environment)
    .AddGoogleAuthenticationIfConfigured(builder.Configuration)
    .AddCsrfProtection()
    .AddApplicationServices()
    .AddCorsConfiguration()
    .AddApi();

var app = builder.Build();

await app.SeedDatabaseAsync();

app.ConfigureMiddleware(app.Environment);

app.Run();
