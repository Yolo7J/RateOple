using RateOple.Core.Contracts;

namespace RateOple.Core.Tests.TestSupport;

public sealed class ThrowingInteractionService : IInteractionService
{
    public const string MediaOpenedFailureMessage = "Injected media-open interaction failure.";
    public const string RatingCreatedFailureMessage = "Injected rating-created interaction failure.";
    public const string ReviewCreatedFailureMessage = "Injected review-created interaction failure.";
    public const string MediaStatusChangedFailureMessage = "Injected media-status-changed interaction failure.";

    public bool ThrowOnMediaOpened { get; set; } = true;
    public bool ThrowOnRatingCreated { get; set; } = true;
    public bool ThrowOnReviewCreated { get; set; } = true;
    public bool ThrowOnMediaStatusChanged { get; set; } = true;

    public int MediaOpenedCalls { get; private set; }
    public int RatingCreatedCalls { get; private set; }
    public int ReviewCreatedCalls { get; private set; }
    public int MediaStatusChangedCalls { get; private set; }

    public Task TrackMediaOpenedAsync(Guid userId, Guid mediaId)
    {
        MediaOpenedCalls++;
        if (ThrowOnMediaOpened)
            throw new InvalidOperationException(MediaOpenedFailureMessage);

        return Task.CompletedTask;
    }

    public Task TrackRatingCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        RatingCreatedCalls++;
        if (ThrowOnRatingCreated)
            throw new InvalidOperationException(RatingCreatedFailureMessage);

        return Task.CompletedTask;
    }

    public Task TrackReviewCreatedAsync(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId)
    {
        ReviewCreatedCalls++;
        if (ThrowOnReviewCreated)
            throw new InvalidOperationException(ReviewCreatedFailureMessage);

        return Task.CompletedTask;
    }

    public Task TrackMediaStatusChangedAsync(Guid userId, Guid mediaId)
    {
        MediaStatusChangedCalls++;
        if (ThrowOnMediaStatusChanged)
            throw new InvalidOperationException(MediaStatusChangedFailureMessage);

        return Task.CompletedTask;
    }
}
