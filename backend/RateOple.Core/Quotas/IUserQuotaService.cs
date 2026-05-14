using RateOple.Constants.Enums;

namespace RateOple.Core.Quotas;

public interface IUserQuotaService
{
    Task EnsureCanCreateCollectionAsync(Guid userId, CollectionOwnerType ownerType, Guid? ownerId, Guid? parentCollectionId);
    Task EnsureCanMoveCollectionAsync(Guid userId, Guid collectionId, Guid? parentCollectionId);
    Task EnsureCanAddCollectionItemAsync(Guid collectionId);
    Task EnsureCanFollowCollectionAsync(Guid userId);
    Task EnsureCanCreateGroupAsync(Guid userId);
    Task EnsureCanJoinGroupAsync(Guid userId);
    Task EnsureCanCreateGroupPostAsync(Guid userId, Guid groupId);
    Task EnsureCanCreateCommentAsync(Guid userId);
    Task EnsureCanCreateReviewAsync(Guid userId);
    Task EnsureCanCreateReportAsync(Guid userId);
    Task EnsureCanCreateRatingAsync(Guid userId);
    Task EnsureCanPinMediaAsync(Guid groupId);
    Task EnsureCanCreateStaffMessageAsync(Guid groupId);
    Task EnsureCanCreateSuspensionAppealAsync(Guid userId);
}
