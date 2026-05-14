using System.Collections.Concurrent;
using RateOple.Core.Auth.Interfaces;

namespace RateOple.Core.Auth.Services;

public sealed class InMemoryLoginFailureTracker : ILoginFailureTracker
{
    private readonly ConcurrentDictionary<string, int> _failures = new();

    public bool ShouldRequireCaptcha(string normalizedEmail, string? remoteIp, int threshold)
    {
        if (threshold <= 0)
            return false;

        return _failures.TryGetValue(BuildKey(normalizedEmail, remoteIp), out var count)
            && count >= threshold;
    }

    public bool RecordFailure(string normalizedEmail, string? remoteIp, int threshold)
    {
        if (threshold <= 0)
            return false;

        var count = _failures.AddOrUpdate(BuildKey(normalizedEmail, remoteIp), 1, (_, existing) => existing + 1);
        return count >= threshold;
    }

    public void Reset(string normalizedEmail, string? remoteIp)
    {
        _failures.TryRemove(BuildKey(normalizedEmail, remoteIp), out _);
    }

    private static string BuildKey(string normalizedEmail, string? remoteIp)
    {
        return $"{normalizedEmail}|{remoteIp ?? "unknown"}";
    }
}
