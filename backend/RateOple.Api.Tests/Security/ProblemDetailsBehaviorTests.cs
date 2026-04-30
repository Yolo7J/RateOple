using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace RateOple.Api.Tests.Security;

public class ProblemDetailsBehaviorTests : IClassFixture<SecurityWebApplicationFactory>
{
    private readonly SecurityWebApplicationFactory _factory;

    public ProblemDetailsBehaviorTests(SecurityWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task InvalidModel_ReturnsValidationProblemDetailsWithMessageExtension()
    {
        var client = _factory.CreateClient();
        var csrf = await client.GetFromJsonAsync<CsrfResponse>("/api/csrf");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/register");
        request.Headers.Add("X-CSRF-TOKEN", csrf!.Token);
        request.Content = JsonContent.Create(new
        {
            username = "ab",
            email = "not-an-email",
            password = "short"
        });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.Equal("Validation failed.", json.RootElement.GetProperty("title").GetString());
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
        Assert.True(json.RootElement.TryGetProperty("message", out _));
        Assert.True(json.RootElement.TryGetProperty("errors", out _));
    }

    private sealed record CsrfResponse(string Token);
}
