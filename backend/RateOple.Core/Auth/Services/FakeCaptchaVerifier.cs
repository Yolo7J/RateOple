using RateOple.Core.Auth.Captcha;
using RateOple.Core.Auth.Interfaces;

namespace RateOple.Core.Auth.Services;

public sealed class FakeCaptchaVerifier : ICaptchaVerifier
{
    public const string ValidToken = "valid-captcha";
    public const string ProviderFailureToken = "captcha-provider-failure";

    public Task<CaptchaVerificationResult> VerifyAsync(
        string token,
        string action,
        string? remoteIp,
        CancellationToken cancellationToken = default)
    {
        var result = token switch
        {
            ValidToken => CaptchaVerificationResult.Valid("Fake"),
            ProviderFailureToken => CaptchaVerificationResult.Invalid("Fake", "provider_unavailable"),
            _ => CaptchaVerificationResult.Invalid("Fake", "invalid_token")
        };

        return Task.FromResult(result);
    }
}
