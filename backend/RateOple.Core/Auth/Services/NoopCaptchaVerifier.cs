using RateOple.Core.Auth.Captcha;
using RateOple.Core.Auth.Interfaces;

namespace RateOple.Core.Auth.Services;

public sealed class NoopCaptchaVerifier : ICaptchaVerifier
{
    public Task<CaptchaVerificationResult> VerifyAsync(
        string token,
        string action,
        string? remoteIp,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(CaptchaVerificationResult.Valid("Noop"));
    }
}
