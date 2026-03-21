using RateOple.Core.Collections.DTOs;

namespace RateOple.Core.Contracts;

public interface ICollectionService
{
    Task<CollectionDto> CreateAsync(Guid userId, CreateCollectionDto dto);
    Task<CollectionDto?> GetByIdAsync(Guid id, Guid? viewerId = null);
    Task<PagedCollectionsDto> QueryAsync(CollectionQueryDto query, Guid? viewerId = null);
    Task<CollectionDto> UpdateAsync(Guid userId, Guid id, UpdateCollectionDto dto);
    Task DeleteAsync(Guid userId, Guid id);
    Task<CollectionDto> AddItemAsync(Guid userId, Guid collectionId, AddCollectionItemDto dto);
    Task<CollectionDto> RemoveItemAsync(Guid userId, Guid collectionId, Guid mediaId);
    Task<CollectionDto> ReorderItemsAsync(Guid userId, Guid collectionId, ReorderCollectionItemsDto dto);
    Task FollowAsync(Guid userId, Guid collectionId);
    Task UnfollowAsync(Guid userId, Guid collectionId);
}
