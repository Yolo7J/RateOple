using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using RateOple.Core.Auth.Captcha;
using RateOple.Core.Auth.Interfaces;

namespace RateOple.Core.Auth.Services;

public sealed class TurnstileCaptchaVerifier : ICaptchaVerifier
{
    private readonly HttpClient _httpClient;
    private readonly CaptchaOptions _options;

    public TurnstileCaptchaVerifier(HttpClient httpClient, IOptions<CaptchaOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task<CaptchaVerificationResult> VerifyAsync(
        string token,
        string action,
        string? remoteIp,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
            return CaptchaVerificationResult.Invalid("Turnstile", "configuration_error");

        if (string.IsNullOrWhiteSpace(token))
            return CaptchaVerificationResult.Invalid("Turnstile", "missing_token");

        try
        {
            var form = new Dictionary<string, string>
            {
                ["secret"] = _options.SecretKey,
                ["response"] = token
            };

            if (!string.IsNullOrWhiteSpace(remoteIp))
                form["remoteip"] = remoteIp;

            using var response = await _httpClient.PostAsync(
                _options.VerifyUrl,
                new FormUrlEncodedContent(form),
                cancellationToken);

            if (!response.IsSuccessStatusCode)
                return CaptchaVerificationResult.Invalid("Turnstile", "provider_unavailable");

            var payload = await response.Content.ReadFromJsonAsync<TurnstileVerifyResponse>(cancellationToken);
            if (payload is null)
                return CaptchaVerificationResult.Invalid("Turnstile", "provider_unavailable");

            if (!payload.Success)
            {
                var errorCode = payload.ErrorCodes?.FirstOrDefault() ?? "invalid_token";
                return CaptchaVerificationResult.Invalid("Turnstile", errorCode);
            }

            if (!string.IsNullOrWhiteSpace(payload.Action)
                && !string.Equals(payload.Action, action, StringComparison.Ordinal))
            {
                return CaptchaVerificationResult.Invalid("Turnstile", "action_mismatch");
            }

            var metadata = new Dictionary<string, string>();
            if (!string.IsNullOrWhiteSpace(payload.Hostname))
                metadata["hostname"] = payload.Hostname;
            if (!string.IsNullOrWhiteSpace(payload.Action))
                metadata["action"] = payload.Action;
            if (!string.IsNullOrWhiteSpace(payload.CData))
                metadata["cdata"] = payload.CData;

            return CaptchaVerificationResult.Valid("Turnstile", payload.ChallengeTimestamp, metadata);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch
        {
            return CaptchaVerificationResult.Invalid("Turnstile", "provider_unavailable");
        }
    }

    private sealed class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("challenge_ts")]
        public DateTimeOffset? ChallengeTimestamp { get; set; }

        [JsonPropertyName("hostname")]
        public string? Hostname { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }

        [JsonPropertyName("action")]
        public string? Action { get; set; }

        [JsonPropertyName("cdata")]
        public string? CData { get; set; }
    }
}
