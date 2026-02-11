namespace RateOple.Core.Contracts;

public interface IVisibilityService
{
    Task<bool> CanViewUserAsync(Guid viewerId, Guid targetUserId);
    Task<bool> CanViewCollectionAsync(Guid viewerId, Guid collectionId);
}

