using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class ThrowingUserTasteService : IUserTasteService
{
    public const string RecalculateUserFailureMessage = "Injected user taste failure.";
    public const string RecalculateMediaContextFailureMessage = "Injected media-context taste failure.";

    public bool ThrowOnRecalculateUser { get; set; } = true;
    public bool ThrowOnRecalculateMediaContext { get; set; } = true;

    public int RecalculateUserCalls { get; private set; }
    public int RecalculateMediaContextCalls { get; private set; }

    public Task RecalculateForUserAsync(Guid userId)
    {
        RecalculateUserCalls++;
        if (ThrowOnRecalculateUser)
            throw new InvalidOperationException(RecalculateUserFailureMessage);

        return Task.CompletedTask;
    }

    public Task RecalculateForMediaContextAsync(Guid userId, Guid mediaId)
    {
        RecalculateMediaContextCalls++;
        if (ThrowOnRecalculateMediaContext)
            throw new InvalidOperationException(RecalculateMediaContextFailureMessage);

        return Task.CompletedTask;
    }
}
