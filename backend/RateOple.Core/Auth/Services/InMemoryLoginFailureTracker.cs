using System.Collections.Concurrent;
using RateOple.Core.Auth.Interfaces;

namespace RateOple.Core.Auth.Services;

public sealed class InMemoryLoginFailureTracker : ILoginFailureTracker
{
    private readonly ConcurrentDictionary<string, int> _failures = new();
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _accountFailures = new();

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
        _accountFailures.TryRemove(normalizedEmail, out _);
    }

    public bool IsAccountRateLimited(string normalizedEmail, int threshold, TimeSpan window, out TimeSpan retryAfter)
    {
        retryAfter = TimeSpan.Zero;
        if (threshold <= 0)
            return false;

        var failures = _accountFailures.GetOrAdd(normalizedEmail, _ => new Queue<DateTime>());
        lock (failures)
        {
            Prune(failures, window);
            if (failures.Count < threshold)
                return false;

            retryAfter = failures.Peek().Add(window) - DateTime.UtcNow;
            if (retryAfter < TimeSpan.Zero)
                retryAfter = TimeSpan.Zero;
            return true;
        }
    }

    public void RecordAccountFailure(string normalizedEmail, TimeSpan window)
    {
        var failures = _accountFailures.GetOrAdd(normalizedEmail, _ => new Queue<DateTime>());
        lock (failures)
        {
            Prune(failures, window);
            failures.Enqueue(DateTime.UtcNow);
        }
    }

    private static string BuildKey(string normalizedEmail, string? remoteIp)
    {
        return $"{normalizedEmail}|{remoteIp ?? "unknown"}";
    }

    private static void Prune(Queue<DateTime> failures, TimeSpan window)
    {
        var cutoff = DateTime.UtcNow - window;
        while (failures.Count > 0 && failures.Peek() <= cutoff)
            failures.Dequeue();
    }
}
