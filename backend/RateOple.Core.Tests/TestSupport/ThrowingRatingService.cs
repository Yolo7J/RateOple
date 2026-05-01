using RateOple.Core.Contracts;
using RateOple.Core.Social.DTOs;

namespace RateOple.Core.Tests.TestSupport;

public sealed class ThrowingRatingService : IRatingService
{
    public const string RateMediaFailureMessage = "Injected media rating failure.";
    public const string RateSeasonFailureMessage = "Injected season rating failure.";
    public const string RateEpisodeFailureMessage = "Injected episode rating failure.";
    public const string DeleteMediaFailureMessage = "Injected media rating delete failure.";
    public const string DeleteSeasonFailureMessage = "Injected season rating delete failure.";
    public const string DeleteEpisodeFailureMessage = "Injected episode rating delete failure.";

    public bool ThrowOnRateMedia { get; set; } = true;
    public bool ThrowOnRateSeason { get; set; } = true;
    public bool ThrowOnRateEpisode { get; set; } = true;
    public bool ThrowOnDeleteMedia { get; set; } = true;
    public bool ThrowOnDeleteSeason { get; set; } = true;
    public bool ThrowOnDeleteEpisode { get; set; } = true;

    public int RateMediaCalls { get; private set; }
    public int RateSeasonCalls { get; private set; }
    public int RateEpisodeCalls { get; private set; }
    public int DeleteMediaCalls { get; private set; }
    public int DeleteSeasonCalls { get; private set; }
    public int DeleteEpisodeCalls { get; private set; }

    public Task<RatingDto> RateMediaAsync(Guid userId, Guid mediaId, int value)
    {
        RateMediaCalls++;
        if (ThrowOnRateMedia)
            throw new InvalidOperationException(RateMediaFailureMessage);

        return Task.FromResult(NewRating(userId, mediaId: mediaId, seasonId: null, episodeId: null, value));
    }

    public Task<RatingDto> RateSeasonAsync(Guid userId, Guid seasonId, int value)
    {
        RateSeasonCalls++;
        if (ThrowOnRateSeason)
            throw new InvalidOperationException(RateSeasonFailureMessage);

        return Task.FromResult(NewRating(userId, mediaId: null, seasonId: seasonId, episodeId: null, value));
    }

    public Task<RatingDto> RateEpisodeAsync(Guid userId, Guid episodeId, int value)
    {
        RateEpisodeCalls++;
        if (ThrowOnRateEpisode)
            throw new InvalidOperationException(RateEpisodeFailureMessage);

        return Task.FromResult(NewRating(userId, mediaId: null, seasonId: null, episodeId: episodeId, value));
    }

    public Task DeleteMediaRatingAsync(Guid userId, Guid mediaId)
    {
        DeleteMediaCalls++;
        if (ThrowOnDeleteMedia)
            throw new InvalidOperationException(DeleteMediaFailureMessage);

        return Task.CompletedTask;
    }

    public Task DeleteSeasonRatingAsync(Guid userId, Guid seasonId)
    {
        DeleteSeasonCalls++;
        if (ThrowOnDeleteSeason)
            throw new InvalidOperationException(DeleteSeasonFailureMessage);

        return Task.CompletedTask;
    }

    public Task DeleteEpisodeRatingAsync(Guid userId, Guid episodeId)
    {
        DeleteEpisodeCalls++;
        if (ThrowOnDeleteEpisode)
            throw new InvalidOperationException(DeleteEpisodeFailureMessage);

        return Task.CompletedTask;
    }

    public Task<MediaRatingSummaryDto> GetMediaRatingSummaryAsync(Guid mediaId, Guid? userId = null)
    {
        return Task.FromResult(new MediaRatingSummaryDto { MediaId = mediaId });
    }

    public Task<TargetRatingSummaryDto> GetSeasonRatingSummaryAsync(Guid seasonId, Guid? userId = null)
    {
        return Task.FromResult(new TargetRatingSummaryDto { SeasonId = seasonId });
    }

    public Task<TargetRatingSummaryDto> GetEpisodeRatingSummaryAsync(Guid episodeId, Guid? userId = null)
    {
        return Task.FromResult(new TargetRatingSummaryDto { EpisodeId = episodeId });
    }

    public Task<IEnumerable<RatingDto>> GetUserRatingsAsync(Guid userId)
    {
        return Task.FromResult(Enumerable.Empty<RatingDto>());
    }

    private static RatingDto NewRating(Guid userId, Guid? mediaId, Guid? seasonId, Guid? episodeId, int value)
    {
        var now = DateTime.UtcNow;
        return new RatingDto
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MediaId = mediaId,
            SeasonId = seasonId,
            EpisodeId = episodeId,
            Value = value,
            CreatedAt = now,
            UpdatedAt = now
        };
    }
}
