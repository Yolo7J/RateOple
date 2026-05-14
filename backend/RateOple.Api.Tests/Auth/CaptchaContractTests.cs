using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using RateOple.Api.Tests.TestSupport;
using RateOple.Core.Auth.Services;
using RateOple.Extensions;

namespace RateOple.Api.Tests.Auth;

public sealed class CaptchaContractTests
{
    [Fact]
    public async Task Register_WithoutCaptcha_Fails()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username = "captcha-missing",
            email = "captcha-missing@example.test",
            password = "Password1"
        });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("CAPTCHA verification failed", body);
    }

    [Fact]
    public async Task Register_WithInvalidCaptcha_Fails()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username = "captcha-invalid",
            email = "captcha-invalid@example.test",
            password = "Password1",
            captchaToken = "invalid-captcha"
        });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("CAPTCHA verification failed", body);
    }

    [Fact]
    public async Task Register_WithValidFakeCaptcha_Succeeds()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username = "captcha-valid",
            email = "captcha-valid@example.test",
            password = "Password1",
            captchaToken = FakeCaptchaVerifier.ValidToken
        });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_BelowThreshold_DoesNotRequireCaptcha()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("captcha-login-below");

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = user.Email,
            password = "WrongPassword1"
        });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_AfterFailedThreshold_RequiresCaptcha()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("captcha-login-threshold");

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = user.Email,
            password = "WrongPassword1"
        }))).StatusCode);

        using var thresholdRequest = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = user.Email,
            password = "WrongPassword1"
        });
        var response = await client.SendAsync(thresholdRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("captcha_required", body.GetProperty("code").GetString());
        Assert.True(body.GetProperty("requiresCaptcha").GetBoolean());
    }

    [Fact]
    public async Task Login_RequiringCaptcha_FailsWithoutToken()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("captcha-login-missing");
        await TriggerCaptchaRequirementAsync(client, csrf, user.Email!);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = user.Email,
            password = "Password1"
        });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Login_RequiringCaptcha_SucceedsWithValidFakeCaptcha()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);
        var user = await factory.AddUserAsync("captcha-login-valid");
        await TriggerCaptchaRequirementAsync(client, csrf, user.Email!);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
        {
            email = user.Email,
            password = "Password1",
            captchaToken = FakeCaptchaVerifier.ValidToken
        });

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CaptchaProviderFailure_ReturnsSafeError()
    {
        using var factory = new ApiTestFactory();
        var client = factory.CreateManualCookieClient();
        var csrf = await factory.GetCsrfAsync(client);

        using var request = Request(csrf, HttpMethod.Post, "/api/auth/register", new
        {
            username = "captcha-provider-failure",
            email = "captcha-provider-failure@example.test",
            password = "Password1",
            captchaToken = FakeCaptchaVerifier.ProviderFailureToken
        });

        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("temporarily unavailable", body);
        Assert.DoesNotContain(FakeCaptchaVerifier.ProviderFailureToken, body);
    }

    [Fact]
    public void ProductionTurnstileConfig_MissingKeys_FailsRegistration()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Email:Provider"] = "Resend",
                ["Email:From"] = "RateOple <no-reply@example.test>",
                ["Email:FrontendBaseUrl"] = "https://rateople.example.test",
                ["Resend:ApiKey"] = "resend-test-key",
                ["Captcha:Enabled"] = "true",
                ["Captcha:Provider"] = "Turnstile",
                ["Captcha:VerifyUrl"] = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
            })
            .Build();
        var services = new ServiceCollection();
        var environment = new TestWebHostEnvironment { EnvironmentName = "Production" };

        var ex = Assert.Throws<InvalidOperationException>(() =>
            services.AddApplicationServices(configuration, environment));

        Assert.Contains("Captcha:SiteKey", ex.Message);
    }

    private static async Task TriggerCaptchaRequirementAsync(HttpClient client, CsrfState csrf, string email)
    {
        for (var i = 0; i < 2; i++)
        {
            using var request = Request(csrf, HttpMethod.Post, "/api/auth/login", new
            {
                email,
                password = "WrongPassword1"
            });

            await client.SendAsync(request);
        }
    }

    private static HttpRequestMessage Request(CsrfState csrf, HttpMethod method, string url, object body)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(body);
        return request;
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "RateOple.Tests";
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
