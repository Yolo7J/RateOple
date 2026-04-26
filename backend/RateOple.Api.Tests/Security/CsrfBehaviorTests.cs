using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace RateOple.Api.Tests.Security;

public class CsrfBehaviorTests : IClassFixture<SecurityWebApplicationFactory>
{
    private readonly SecurityWebApplicationFactory _factory;

    public CsrfBehaviorTests(SecurityWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MutatingEndpoint_WithoutCsrfToken_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/auth/logout", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task MutatingEndpoint_WithCsrfToken_ReachesEndpoint()
    {
        var client = _factory.CreateClient();
        var csrf = await client.GetFromJsonAsync<CsrfResponse>("/api/csrf");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("X-CSRF-TOKEN", csrf!.Token);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private sealed record CsrfResponse(string Token);
}

public sealed class SecurityWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Port=5432;Database=RateOpleTests;Username=postgres;Password=postgres",
                ["Jwt:Key"] = "TestingOnlyJwtSigningKey-ReplaceInRealEnvironments",
                ["Jwt:Issuer"] = "RateOple.Tests",
                ["Jwt:Audience"] = "RateOple.Tests",
                ["Seed:Mode"] = "None"
            });
        });
    }
}
