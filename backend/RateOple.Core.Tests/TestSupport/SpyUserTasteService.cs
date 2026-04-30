using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class SpyUserTasteService : IUserTasteService
{
    public List<Guid> RecalculateUserCalls { get; } = new();
    public List<(Guid UserId, Guid MediaId)> RecalculateMediaContextCalls { get; } = new();

    public Task RecalculateForUserAsync(Guid userId)
    {
        RecalculateUserCalls.Add(userId);
        return Task.CompletedTask;
    }

    public Task RecalculateForMediaContextAsync(Guid userId, Guid mediaId)
    {
        RecalculateMediaContextCalls.Add((userId, mediaId));
        return Task.CompletedTask;
    }
}
