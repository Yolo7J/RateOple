using RateOple.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddDatabase(builder.Configuration)
    .AddIdentityConfiguration()
    .AddAuthorizationPolicies()
    .AddJwtAuthentication(builder.Configuration)
    .AddCsrfProtection()
    .AddApplicationServices()
    .AddCorsConfiguration()
    .AddApi();

var app = builder.Build();

await app.SeedDatabaseAsync();

app.ConfigureMiddleware(app.Environment);

app.Run();
