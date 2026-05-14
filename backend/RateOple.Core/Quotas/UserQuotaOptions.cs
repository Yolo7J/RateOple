namespace RateOple.Core.Quotas;

public sealed class UserQuotaOptions
{
    public int CollectionsPerUser { get; set; } = 100;
    public int NestedCollectionsPerParent { get; set; } = 25;
    public int CollectionNestingDepth { get; set; } = 3;
    public int CollectionItemsPerCollection { get; set; } = 250;
    public int FollowedCollectionsPerUser { get; set; } = 500;
    public int GroupsOwnedPerUser { get; set; } = 10;
    public int GroupMembershipsPerUser { get; set; } = 100;
    public int PostsPerGroupPerUserPerDay { get; set; } = 25;
    public int CommentsPerUserPerDay { get; set; } = 150;
    public int ReviewsPerUserPerDay { get; set; } = 50;
    public int ReportsPerUserPerDay { get; set; } = 25;
    public int RatingsPerUserPerDay { get; set; } = 300;
    public int PinnedMediaPerGroup { get; set; } = 25;
    public int StaffMessagesPerGroupPerDay { get; set; } = 100;
    public int SuspensionAppealsPerUserPerDay { get; set; } = 3;
    public int SuspensionAppealRejectedCooldownDays { get; set; } = 7;
}
