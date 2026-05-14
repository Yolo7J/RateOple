namespace RateOple.Core.Auth.Interfaces;

public interface ILoginFailureTracker
{
    bool ShouldRequireCaptcha(string normalizedEmail, string? remoteIp, int threshold);
    bool RecordFailure(string normalizedEmail, string? remoteIp, int threshold);
    bool IsAccountRateLimited(string normalizedEmail, int threshold, TimeSpan window, out TimeSpan retryAfter);
    void RecordAccountFailure(string normalizedEmail, TimeSpan window);
    void Reset(string normalizedEmail, string? remoteIp);
}
