using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class SpyInteractionService : IInteractionService
{
    public List<(Guid UserId, Guid MediaId)> MediaOpenedCalls { get; } = new();
    public List<(Guid UserId, Guid? MediaId, Guid? SeasonId, Guid? EpisodeId)> RatingCreatedCalls { get; } = new();
    public List<(Guid UserId, Guid? MediaId, Guid? SeasonId, Guid? EpisodeId)> ReviewCreatedCalls { get; } = new();
    public List<(Guid UserId, Guid MediaId)> MediaStatusChangedCalls { get; } = new();

    public Task TrackMediaOpenedAsync(Guid userId, Guid mediaId)
    {
        MediaOpenedCalls.Add((userId, mediaId));
        return Task.CompletedTask;
    }

    public Task TrackRatingCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        RatingCreatedCalls.Add((userId, mediaId, seasonId, episodeId));
        return Task.CompletedTask;
    }

    public Task TrackReviewCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        ReviewCreatedCalls.Add((userId, mediaId, seasonId, episodeId));
        return Task.CompletedTask;
    }

    public Task TrackMediaStatusChangedAsync(Guid userId, Guid mediaId)
    {
        MediaStatusChangedCalls.Add((userId, mediaId));
        return Task.CompletedTask;
    }
}
