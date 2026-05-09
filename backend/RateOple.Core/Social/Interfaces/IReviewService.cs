using RateOple.Core.Social.DTOs;

namespace RateOple.Core.Contracts;

public interface IReviewService
{
    Task<ReviewDto> CreateReviewAsync(Guid userId, CreateReviewDto dto);
    Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid reviewId, UpdateReviewDto dto);
    Task DeleteReviewAsync(Guid userId, Guid reviewId, bool deleteRating);
    Task<IReadOnlyList<ReviewDto>> GetMediaReviewsAsync(Guid mediaId, ReviewTargetFilter target = ReviewTargetFilter.All);
    Task<IReadOnlyList<ReviewDto>> GetSeasonReviewsAsync(Guid seasonId);
    Task<IReadOnlyList<ReviewDto>> GetEpisodeReviewsAsync(Guid episodeId);
    Task<IReadOnlyList<ReviewDto>> GetUserReviewsAsync(Guid userId);
}
