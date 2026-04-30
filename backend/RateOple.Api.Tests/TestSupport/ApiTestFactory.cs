using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Net.Http.Json;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.TestSupport;

public sealed class ApiTestFactory : WebApplicationFactory<Program>
{
    private const string JwtKey = "TestingOnlyJwtSigningKey-AtLeastThirtyTwoBytes";
    private const string TestAuthScheme = "TestAuth";
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly ServiceProvider _sqliteProvider = new ServiceCollection()
        .AddEntityFrameworkSqlite()
        .BuildServiceProvider();
    private readonly bool _useTestAuth;

    public ApiTestFactory(bool useTestAuth = false)
    {
        _useTestAuth = useTestAuth;
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Data Source=:memory:",
                ["Jwt:Key"] = JwtKey,
                ["Jwt:Issuer"] = "RateOple.Tests",
                ["Jwt:Audience"] = "RateOple.Tests",
                ["Seed:Mode"] = "None"
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
            services.RemoveAll<ApplicationDbContext>();
            services.AddDbContext<ApplicationDbContext>(options => options
                .UseSqlite(_connection)
                .UseInternalServiceProvider(_sqliteProvider));

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Database.EnsureCreated();
        });

        if (_useTestAuth)
        {
            builder.ConfigureTestServices(services =>
            {
                services
                    .AddAuthentication(options =>
                    {
                        options.DefaultAuthenticateScheme = TestAuthScheme;
                        options.DefaultChallengeScheme = TestAuthScheme;
                        options.DefaultScheme = TestAuthScheme;
                    })
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthScheme, _ => { });
            });
        }
    }

    public HttpClient CreateManualCookieClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = false
        });
    }

    public async Task<User> AddUserAsync(string userName, params string[] roles)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        foreach (var role in RoleConstants.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        var user = new User
        {
            UserName = userName,
            Email = $"{userName}@example.test",
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, "Password1");
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        foreach (var role in roles)
            await userManager.AddToRoleAsync(user, role);

        await db.SaveChangesAsync();
        return user;
    }

    public async Task WithDbAsync(Func<ApplicationDbContext, Task> action)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await action(db);
        await db.SaveChangesAsync();
    }

    public string CreateAccessToken(User user, params string[] roles)
    {
        using var scope = Services.CreateScope();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtService>();
        return jwt.GenerateAccessToken(user, roles);
    }

    public static void AddTestAuthHeaders(HttpRequestMessage request, User user, params string[] roles)
    {
        request.Headers.Add(TestAuthHandler.UserIdHeader, user.Id.ToString());
        if (roles.Length > 0)
            request.Headers.Add(TestAuthHandler.RolesHeader, string.Join(",", roles));
    }

    public async Task<CsrfState> GetCsrfAsync(HttpClient client)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/csrf");
        return await GetCsrfAsync(client, request);
    }

    public async Task<CsrfState> GetCsrfAsync(HttpClient client, User user, params string[] roles)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/csrf");
        AddTestAuthHeaders(request, user, roles);
        return await GetCsrfAsync(client, request);
    }

    private static async Task<CsrfState> GetCsrfAsync(HttpClient client, HttpRequestMessage request)
    {
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<CsrfResponse>()
            ?? throw new InvalidOperationException("CSRF response was empty.");
        var cookie = response.Headers
            .GetValues("Set-Cookie")
            .Select(value => value.Split(';', 2)[0])
            .First(value => value.StartsWith("X-CSRF-COOKIE=", StringComparison.Ordinal));

        return new CsrfState(body.Token, cookie);
    }

    public async Task<CsrfState> SignInAsync(HttpClient client, User user)
    {
        var csrf = await GetCsrfAsync(client);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Content = JsonContent.Create(new
        {
            email = user.Email,
            password = "Password1"
        });

        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return csrf;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
            _sqliteProvider.Dispose();
        }
    }

    private sealed record CsrfResponse(string Token);
}

public sealed record CsrfState(string Token, string Cookie);

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string UserIdHeader = "X-Test-UserId";
    public const string RolesHeader = "X-Test-Roles";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserIdHeader, out var userIdValues))
            return Task.FromResult(AuthenticateResult.NoResult());

        var userId = userIdValues.ToString();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, userId)
        };

        if (Request.Headers.TryGetValue(RolesHeader, out var rolesValues))
        {
            claims.AddRange(rolesValues
                .ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(role => new Claim(ClaimTypes.Role, role)));
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
