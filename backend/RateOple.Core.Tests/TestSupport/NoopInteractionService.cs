using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class NoopInteractionService : IInteractionService
{
    public Task TrackMediaOpenedAsync(Guid userId, Guid mediaId) => Task.CompletedTask;

    public Task TrackRatingCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId) => Task.CompletedTask;

    public Task TrackReviewCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId) => Task.CompletedTask;

    public Task TrackMediaStatusChangedAsync(Guid userId, Guid mediaId) => Task.CompletedTask;
}
