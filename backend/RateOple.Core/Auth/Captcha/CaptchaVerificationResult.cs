namespace RateOple.Core.Auth.Captcha;

public sealed record CaptchaVerificationResult(
    bool Success,
    string Provider,
    string? ErrorCode = null,
    DateTimeOffset? ChallengeTimestamp = null,
    IReadOnlyDictionary<string, string>? Metadata = null)
{
    public static CaptchaVerificationResult Valid(
        string provider,
        DateTimeOffset? challengeTimestamp = null,
        IReadOnlyDictionary<string, string>? metadata = null)
    {
        return new CaptchaVerificationResult(true, provider, null, challengeTimestamp, metadata);
    }

    public static CaptchaVerificationResult Invalid(string provider, string errorCode)
    {
        return new CaptchaVerificationResult(false, provider, errorCode);
    }
}
