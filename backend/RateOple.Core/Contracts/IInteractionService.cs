namespace RateOple.Core.Contracts;

public interface IInteractionService
{
    Task TrackMediaOpenedAsync(Guid userId, Guid mediaId);
    Task TrackRatingCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId);
    Task TrackReviewCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId);
    Task TrackMediaStatusChangedAsync(Guid userId, Guid mediaId);
}
