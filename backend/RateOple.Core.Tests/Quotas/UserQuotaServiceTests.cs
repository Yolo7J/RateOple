using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RateOple.Constants.Enums;
using RateOple.Core.Quotas;
using RateOple.Core.Tests.TestSupport;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.Quotas;

public class UserQuotaServiceTests
{
    [Fact]
    public async Task CollectionQuotas_AreEnforced()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("collection-quota"));
        var parent = data.Collections.UserCollection(user, "Parent");
        data.Collections.UserCollection(user, "Existing");
        data.Collections.UserCollection(user, "Child", parent);
        var media = data.Media.Movie("Existing item");
        data.Collections.Item(parent, media);
        await data.SaveAsync();
        var quota = CreateQuota(db, new UserQuotaOptions
        {
            CollectionsPerUser = 2,
            NestedCollectionsPerParent = 1,
            CollectionNestingDepth = 2,
            CollectionItemsPerCollection = 1
        });

        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateCollectionAsync(user.Id, CollectionOwnerType.User, user.Id, null));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateCollectionAsync(user.Id, CollectionOwnerType.Group, Guid.NewGuid(), parent.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanAddCollectionItemAsync(parent.Id));

        var child = await db.Context.Collections.SingleAsync(c => c.ParentCollectionId == parent.Id);
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateCollectionAsync(user.Id, CollectionOwnerType.Group, Guid.NewGuid(), child.Id));
    }

    [Fact]
    public async Task MembershipAndGroupQuotas_AreEnforced()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("group-quota-owner"));
        data.Groups.Group(owner);
        await data.SaveAsync();
        var quota = CreateQuota(db, new UserQuotaOptions { GroupsOwnedPerUser = 1, GroupMembershipsPerUser = 1 });

        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateGroupAsync(owner.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanJoinGroupAsync(owner.Id));
    }

    [Fact]
    public async Task DailyContentQuotas_AreEnforced()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("daily-quota"));
        var group = data.Groups.Group(user);
        var post = data.Groups.Post(group, user);
        var media = data.Media.Movie("Rated");
        var rating = data.Rating(user.Id, media.Id);
        data.GroupPostComment(user.Id, post.Id);
        db.Context.Reviews.Add(new Review
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            MediaId = media.Id,
            RatingId = rating.Id,
            Content = "Review",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.Context.Reports.Add(new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = user.Id,
            TargetType = ReportTargetType.User,
            TargetId = user.Id,
            Reason = "Report",
            CreatedAt = DateTime.UtcNow
        });
        await data.SaveAsync();
        var quota = CreateQuota(db, new UserQuotaOptions
        {
            PostsPerGroupPerUserPerDay = 1,
            CommentsPerUserPerDay = 1,
            ReviewsPerUserPerDay = 1,
            ReportsPerUserPerDay = 1,
            RatingsPerUserPerDay = 1
        });

        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateGroupPostAsync(user.Id, group.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateCommentAsync(user.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateReviewAsync(user.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateReportAsync(user.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateRatingAsync(user.Id));
    }

    [Fact]
    public async Task CollectionFollowPinnedMediaStaffMessageAndAppealQuotas_AreEnforced()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("misc-quota"));
        var group = data.Groups.Group(user);
        var collection = data.Collections.UserCollection(user);
        var media = data.Media.Movie("Pinned");
        data.Collections.Follow(user, collection);
        db.Context.GroupMediaLinks.Add(new GroupMedia
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            MediaId = media.Id,
            AddedAt = DateTime.UtcNow
        });
        db.Context.GroupStaffMessages.Add(new GroupStaffMessage
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            AuthorId = user.Id,
            Content = "Staff",
            CreatedAt = DateTime.UtcNow
        });
        db.Context.SuspensionAppeals.Add(new SuspensionAppeal
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Text = "Pending appeal",
            Status = SuspensionAppealStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await data.SaveAsync();
        var quota = CreateQuota(db, new UserQuotaOptions
        {
            FollowedCollectionsPerUser = 1,
            PinnedMediaPerGroup = 1,
            StaffMessagesPerGroupPerDay = 1,
            SuspensionAppealsPerUserPerDay = 3
        });

        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanFollowCollectionAsync(user.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanPinMediaAsync(group.Id));
        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateStaffMessageAsync(group.Id));

        var exception = await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateSuspensionAppealAsync(user.Id));
        Assert.Equal("pending_appeal_exists", exception.Code);
    }

    [Fact]
    public async Task StaffDoesNotBypassNormalUserQuotas()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var staff = data.Users.Add(data.Users.Admin("staff-quota"));
        data.Groups.Group(staff);
        await data.SaveAsync();
        var quota = CreateQuota(db, new UserQuotaOptions { GroupsOwnedPerUser = 1 });

        await Assert.ThrowsAsync<QuotaExceededException>(() => quota.EnsureCanCreateGroupAsync(staff.Id));
    }

    private static UserQuotaService CreateQuota(SqliteTestDb db, UserQuotaOptions options)
    {
        return new UserQuotaService(db.Context, Options.Create(options));
    }
}
