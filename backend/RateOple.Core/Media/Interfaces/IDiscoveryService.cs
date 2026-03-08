using RateOple.Core.Media.DTOs;

namespace RateOple.Core.Contracts;

public interface IDiscoveryService
{
    Task<IReadOnlyList<MediaListItemDto>> GetTrendingAsync(int limit = 20);
    Task<IReadOnlyList<MediaListItemDto>> GetPopularAsync(int limit = 20);
    Task<IReadOnlyList<MediaListItemDto>> GetRecommendedAsync(Guid userId, int limit = 20);
    Task<IReadOnlyList<MediaListItemDto>> GetSimilarAsync(Guid mediaId, int limit = 20);
}
