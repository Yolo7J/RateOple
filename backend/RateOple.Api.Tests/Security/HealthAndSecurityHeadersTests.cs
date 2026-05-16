using System.Net;
using System.Net.Http.Json;

namespace RateOple.Api.Tests.Security;

public class HealthAndSecurityHeadersTests : IClassFixture<SecurityWebApplicationFactory>
{
    private readonly SecurityWebApplicationFactory _factory;

    public HealthAndSecurityHeadersTests(SecurityWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsSafeStatus()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body?.Status);
        Assert.Equal("RateOple", body?.Service);
    }

    [Fact]
    public async Task SecurityHeaders_AllowTurnstileWithoutWildcardScriptSource()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");
        var csp = response.Headers.GetValues("Content-Security-Policy").Single();

        Assert.Contains("script-src 'self' https://challenges.cloudflare.com", csp);
        Assert.Contains("frame-src https://challenges.cloudflare.com", csp);
        Assert.DoesNotContain("script-src *", csp);
    }

    private sealed record HealthResponse(string Status, string Service);
}
