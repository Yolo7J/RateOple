using RateOple.Core.Contracts.DTOs;

namespace RateOple.Core.Contracts;

public interface IRatingService
{
    Task<RatingDto> RateMediaAsync(Guid userId, Guid mediaId, int value);
    Task DeleteRatingAsync(Guid userId, Guid mediaId);
    Task<MediaRatingSummaryDto> GetMediaRatingSummaryAsync(Guid mediaId, Guid? userId = null);
    Task<IEnumerable<RatingDto>> GetUserRatingsAsync(Guid userId);
}
