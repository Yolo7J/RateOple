using RateOple.Core.Social.DTOs;

namespace RateOple.Core.Contracts;

public interface IRatingService
{
    Task<RatingDto> RateMediaAsync(Guid userId, Guid mediaId, int value);
    Task<RatingDto> RateSeasonAsync(Guid userId, Guid seasonId, int value);
    Task<RatingDto> RateEpisodeAsync(Guid userId, Guid episodeId, int value);
    Task DeleteMediaRatingAsync(Guid userId, Guid mediaId);
    Task DeleteSeasonRatingAsync(Guid userId, Guid seasonId);
    Task DeleteEpisodeRatingAsync(Guid userId, Guid episodeId);
    Task<MediaRatingSummaryDto> GetMediaRatingSummaryAsync(Guid mediaId, Guid? userId = null);
    Task<TargetRatingSummaryDto> GetSeasonRatingSummaryAsync(Guid seasonId, Guid? userId = null);
    Task<TargetRatingSummaryDto> GetEpisodeRatingSummaryAsync(Guid episodeId, Guid? userId = null);
    Task<IEnumerable<RatingDto>> GetUserRatingsAsync(Guid userId);
}
