using RateOple.Core.Social.DTOs;

namespace RateOple.Core.Contracts;

public interface IReviewService
{
    Task<ReviewDto> CreateReviewAsync(Guid userId, CreateReviewDto dto);
    Task<ReviewDto> UpdateReviewAsync(Guid userId, Guid reviewId, UpdateReviewDto dto);
    Task DeleteReviewAsync(Guid userId, Guid reviewId, bool deleteRating);
    Task<IReadOnlyList<ReviewDto>> GetMediaReviewsAsync(Guid mediaId);
    Task<IReadOnlyList<ReviewDto>> GetUserReviewsAsync(Guid userId);
}
