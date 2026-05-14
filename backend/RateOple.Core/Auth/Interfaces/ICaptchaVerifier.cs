using RateOple.Core.Auth.Captcha;

namespace RateOple.Core.Auth.Interfaces;

public interface ICaptchaVerifier
{
    Task<CaptchaVerificationResult> VerifyAsync(
        string token,
        string action,
        string? remoteIp,
        CancellationToken cancellationToken = default);
}
