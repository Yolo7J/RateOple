namespace RateOple.Core.Auth.Interfaces;

public interface ILoginFailureTracker
{
    bool ShouldRequireCaptcha(string normalizedEmail, string? remoteIp, int threshold);
    bool RecordFailure(string normalizedEmail, string? remoteIp, int threshold);
    void Reset(string normalizedEmail, string? remoteIp);
}
