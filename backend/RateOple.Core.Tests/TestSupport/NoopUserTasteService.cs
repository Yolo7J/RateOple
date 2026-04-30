using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class NoopUserTasteService : IUserTasteService
{
    public Task RecalculateForUserAsync(Guid userId) => Task.CompletedTask;

    public Task RecalculateForMediaContextAsync(Guid userId, Guid mediaId) => Task.CompletedTask;
}
