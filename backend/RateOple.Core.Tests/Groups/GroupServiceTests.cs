using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Groups.DTOs;
using RateOple.Core.Groups.Services;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Groups;

public class GroupServiceTests
{
    [Fact]
    public async Task CreateGroupAsync_CreatesOwnerMembership()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("group-owner"));
        await data.SaveAsync();
        var service = CreateService(db);

        var group = await service.CreateGroupAsync(owner.Id, new CreateGroupDto
        {
            Name = "  Film Club  ",
            Visibility = GroupVisibility.Public
        });

        Assert.Equal("Film Club", group.Name);
        Assert.Equal(owner.Id, group.OwnerId);
        var membership = await db.Context.GroupMemberships.SingleAsync(m => m.GroupId == group.Id);
        Assert.Equal(owner.Id, membership.UserId);
        Assert.Equal(GroupRole.Owner, membership.Role);
    }

    [Fact]
    public async Task LeaveGroupAsync_OwnerCannotLeave()
    {
        await using var db = await SeedGroupAsync();
        var service = CreateService(db);
        var ownerId = await db.Context.Groups.Select(g => g.OwnerId).SingleAsync();
        var groupId = await db.Context.Groups.Select(g => g.Id).SingleAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.LeaveGroupAsync(ownerId, groupId));
    }

    [Fact]
    public async Task JoinGroupAsync_BannedUserCannotJoin()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var owner = await db.Context.Users.SingleAsync(u => u.Id == group.OwnerId);
        var banned = data.Users.Add(data.Users.Normal("banned-user"));
        data.Groups.Ban(group, banned, owner);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.JoinGroupAsync(banned.Id, group.Id));
    }

    [Fact]
    public async Task CreatePostAsync_BannedMemberCannotPost()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var owner = await db.Context.Users.SingleAsync(u => u.Id == group.OwnerId);
        var member = data.Users.Add(data.Users.Normal("banned-member"));
        data.Groups.Membership(group, member);
        data.Groups.Ban(group, member, owner);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreatePostAsync(member.Id, group.Id, ValidPost()));
    }

    [Fact]
    public async Task CreatePostAsync_NonMemberCannotPost()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var outsider = data.Users.Add(data.Users.Normal("outsider"));
        await data.SaveAsync();
        var groupId = await db.Context.Groups.Select(g => g.Id).SingleAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreatePostAsync(outsider.Id, groupId, ValidPost()));
    }

    [Fact]
    public async Task SetMemberRoleAsync_OwnerCanPromoteMember()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("promoted-member"));
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        await service.SetMemberRoleAsync(group.OwnerId, group.Id, member.Id, new SetGroupMemberRoleDto
        {
            Role = GroupRole.GroupModerator
        });

        var membership = await db.Context.GroupMemberships.SingleAsync(m => m.GroupId == group.Id && m.UserId == member.Id);
        Assert.Equal(GroupRole.GroupModerator, membership.Role);
    }

    [Fact]
    public async Task SetMemberRoleAsync_NonOwnerCannotAssignAdmin()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var actor = data.Users.Add(data.Users.Normal("actor-member"));
        var target = data.Users.Add(data.Users.Normal("target-member"));
        data.Groups.Membership(group, actor);
        data.Groups.Membership(group, target);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.SetMemberRoleAsync(
            actor.Id,
            group.Id,
            target.Id,
            new SetGroupMemberRoleDto { Role = GroupRole.GroupAdmin }));
    }

    [Fact]
    public async Task SetMemberRoleAsync_OwnerRoleIsReserved()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("member"));
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.SetMemberRoleAsync(
            group.OwnerId,
            group.Id,
            member.Id,
            new SetGroupMemberRoleDto { Role = GroupRole.Owner }));
    }

    [Fact]
    public async Task TransferOwnershipAsync_OwnerTransfersToEligibleMember_AndOldOwnerBecomesAdmin()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("transfer-member"));
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);
        var oldOwnerId = group.OwnerId;

        await service.TransferOwnershipAsync(group.OwnerId, group.Id, member.Id, force: false);

        Assert.Equal(member.Id, await db.Context.Groups.Where(g => g.Id == group.Id).Select(g => g.OwnerId).SingleAsync());
        Assert.Equal(GroupRole.Owner, await db.Context.GroupMemberships.Where(m => m.GroupId == group.Id && m.UserId == member.Id).Select(m => m.Role).SingleAsync());
        Assert.Equal(GroupRole.GroupAdmin, await db.Context.GroupMemberships.Where(m => m.GroupId == group.Id && m.UserId == oldOwnerId).Select(m => m.Role).SingleAsync());
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(l => l.Action == ModerationAuditAction.GroupOwnershipTransferred && l.ScopeId == group.Id));
    }

    [Fact]
    public async Task TransferOwnershipAsync_RejectsIneligibleTargets()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var unconfirmed = data.Users.Add(data.Users.Normal("unconfirmed-target"));
        unconfirmed.EmailConfirmed = false;
        var suspended = data.Users.Add(data.Users.Normal("suspended-target"));
        suspended.IsSuspended = true;
        var deleted = data.Users.Add(data.Users.Normal("deleted-target"));
        deleted.IsDeleted = true;
        var banned = data.Users.Add(data.Users.Normal("banned-target"));
        var nonMember = data.Users.Add(data.Users.Normal("nonmember-target"));
        data.Groups.Membership(group, unconfirmed);
        data.Groups.Membership(group, suspended);
        data.Groups.Membership(group, deleted);
        data.Groups.Membership(group, banned);
        data.Groups.Ban(group, banned, await db.Context.Users.SingleAsync(u => u.Id == group.OwnerId));
        await data.SaveAsync();
        var service = CreateService(db);

        foreach (var targetId in new[] { unconfirmed.Id, suspended.Id, deleted.Id, banned.Id, nonMember.Id })
        {
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.TransferOwnershipAsync(
                group.OwnerId,
                group.Id,
                targetId,
                force: false));
        }
    }

    [Fact]
    public async Task TransferOwnershipAsync_ForceAllowsGlobalStaffActor()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var admin = data.Users.Add(data.Users.Normal("global-admin"));
        var member = data.Users.Add(data.Users.Normal("force-member"));
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        await service.TransferOwnershipAsync(admin.Id, group.Id, member.Id, force: true);

        Assert.Equal(member.Id, await db.Context.Groups.Where(g => g.Id == group.Id).Select(g => g.OwnerId).SingleAsync());
    }

    [Fact]
    public async Task ArchivedGroup_IsReadOnlyAndHiddenFromDiscovery()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        group.IsArchived = true;
        group.ArchivedAt = DateTime.UtcNow;
        var member = data.Users.Add(data.Users.Normal("archived-member"));
        await data.SaveAsync();
        var service = CreateService(db);

        var groups = await service.GetGroupsAsync(new GroupQueryDto());

        Assert.DoesNotContain(groups.Items, g => g.Id == group.Id);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.JoinGroupAsync(member.Id, group.Id));
    }

    [Fact]
    public async Task PrivateGroup_DetailsAndPostsRequireMembership()
    {
        await using var db = await SeedGroupAsync(GroupVisibility.Private);
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var outsider = data.Users.Add(data.Users.Normal("private-outsider"));
        var member = data.Users.Add(data.Users.Normal("private-member"));
        data.Groups.Membership(group, member);
        data.Groups.Post(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        Assert.Null(await service.GetGroupByIdAsync(group.Id));
        Assert.Null(await service.GetGroupByIdAsync(group.Id, outsider.Id));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.GetPostsAsync(group.Id, 1, 20, outsider.Id));

        var visibleGroup = await service.GetGroupByIdAsync(group.Id, member.Id);
        var posts = await service.GetPostsAsync(group.Id, 1, 20, member.Id);

        Assert.NotNull(visibleGroup);
        Assert.Single(posts.Items);
    }

    [Fact]
    public async Task GetGroupsAsync_PublicGroupVisibleToAnonymous()
    {
        await using var db = await SeedGroupAsync(GroupVisibility.Public);
        var groupId = await db.Context.Groups.Select(g => g.Id).SingleAsync();
        var service = CreateService(db);

        var result = await service.GetGroupsAsync(new GroupQueryDto());

        Assert.Contains(result.Items, g => g.Id == groupId);
    }

    [Fact]
    public async Task CreatePostAsync_AttachesValidMedia()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("posting-member"));
        var movie = data.Media.Movie("Attached Movie");
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        var post = await service.CreatePostAsync(member.Id, group.Id, ValidPost([movie.Id]));

        Assert.Single(post.Media);
        Assert.Equal(movie.Id, post.Media[0].MediaId);
    }

    [Fact]
    public async Task GetPostsAndComments_DeletedUserRendersDeletedUserDisplay()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var deletedUser = data.Users.Add(data.Users.Normal("deleted-discussion-user"));
        deletedUser.IsDeleted = true;
        data.Users.Profile(deletedUser, "Old Discussion Name");
        data.Groups.Membership(group, deletedUser);
        var post = data.Groups.Post(group, deletedUser);
        data.GroupPostComment(deletedUser.Id, post.Id, "public comment");
        await data.SaveAsync();
        var service = CreateService(db);

        var posts = await service.GetPostsAsync(group.Id, 1, 20);
        var comments = await service.GetPostCommentsAsync(group.Id, post.Id);

        Assert.Equal("Deleted user", Assert.Single(posts.Items).DisplayName);
        Assert.Equal("Deleted user", Assert.Single(comments).DisplayName);
    }

    [Fact]
    public async Task CreatePostAsync_RejectsDuplicateEmptyMissingOrDeletedMediaIds()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("media-member"));
        var movie = data.Media.Movie("Valid Movie");
        var deleted = data.Media.Movie("Deleted Movie", isDeleted: true);
        data.Groups.Membership(group, member);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreatePostAsync(member.Id, group.Id, ValidPost([movie.Id, movie.Id])));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreatePostAsync(member.Id, group.Id, ValidPost([Guid.Empty])));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreatePostAsync(member.Id, group.Id, ValidPost([Guid.NewGuid()])));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreatePostAsync(member.Id, group.Id, ValidPost([deleted.Id])));
    }

    [Fact]
    public async Task CreateStaffMessageAsync_RequiresStaffRole()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("staff-member"));
        var moderator = data.Users.Add(data.Users.Normal("staff-mod"));
        data.Groups.Membership(group, member);
        data.Groups.Membership(group, moderator, GroupRole.GroupModerator);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.CreateStaffMessageAsync(
            member.Id,
            group.Id,
            new CreateGroupStaffMessageDto { Content = "member message" }));

        var message = await service.CreateStaffMessageAsync(
            moderator.Id,
            group.Id,
            new CreateGroupStaffMessageDto { Content = " staff note " });

        Assert.Equal("staff note", message.Content);
    }

    [Fact]
    public async Task AddPinnedMediaAsync_RequiresStaffRoleAndValidMedia()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var member = data.Users.Add(data.Users.Normal("pin-member"));
        var moderator = data.Users.Add(data.Users.Normal("pin-mod"));
        var media = data.Media.Movie("Pinned Movie");
        data.Groups.Membership(group, member);
        data.Groups.Membership(group, moderator, GroupRole.GroupModerator);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.AddPinnedMediaAsync(member.Id, group.Id, media.Id));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddPinnedMediaAsync(moderator.Id, group.Id, Guid.NewGuid()));

        await service.AddPinnedMediaAsync(moderator.Id, group.Id, media.Id);
        await service.AddPinnedMediaAsync(moderator.Id, group.Id, media.Id);

        var pinned = await service.GetPinnedMediaAsync(group.Id);
        Assert.Single(pinned);
        Assert.Equal(media.Id, pinned[0].MediaId);
    }

    [Fact]
    public async Task BanUserAsync_OwnerCanBanStaffAndMembers_ButNotSelf()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var admin = data.Users.Add(data.Users.Normal("ban-admin"));
        var moderator = data.Users.Add(data.Users.Normal("ban-mod"));
        var member = data.Users.Add(data.Users.Normal("ban-member"));
        data.Groups.Membership(group, admin, GroupRole.GroupAdmin);
        data.Groups.Membership(group, moderator, GroupRole.GroupModerator);
        data.Groups.Membership(group, member, GroupRole.Member);
        await data.SaveAsync();
        var service = CreateService(db);

        await service.BanUserAsync(group.OwnerId, group.Id, new CreateGroupBanDto { UserId = admin.Id });
        await service.BanUserAsync(group.OwnerId, group.Id, new CreateGroupBanDto { UserId = moderator.Id });
        await service.BanUserAsync(group.OwnerId, group.Id, new CreateGroupBanDto { UserId = member.Id });

        Assert.False(await db.Context.GroupMemberships.AnyAsync(m => m.UserId == admin.Id || m.UserId == moderator.Id || m.UserId == member.Id));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.BanUserAsync(
            group.OwnerId,
            group.Id,
            new CreateGroupBanDto { UserId = group.OwnerId }));
    }

    [Fact]
    public async Task BanUserAsync_GroupAdminCannotBanOwnerOrStaff()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var admin = data.Users.Add(data.Users.Normal("limited-admin"));
        var otherAdmin = data.Users.Add(data.Users.Normal("other-admin"));
        var moderator = data.Users.Add(data.Users.Normal("other-mod"));
        data.Groups.Membership(group, admin, GroupRole.GroupAdmin);
        data.Groups.Membership(group, otherAdmin, GroupRole.GroupAdmin);
        data.Groups.Membership(group, moderator, GroupRole.GroupModerator);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.BanUserAsync(
            admin.Id,
            group.Id,
            new CreateGroupBanDto { UserId = group.OwnerId }));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.BanUserAsync(
            admin.Id,
            group.Id,
            new CreateGroupBanDto { UserId = otherAdmin.Id }));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.BanUserAsync(
            admin.Id,
            group.Id,
            new CreateGroupBanDto { UserId = moderator.Id }));
    }

    [Fact]
    public async Task BanUserAsync_ForceAllowsGlobalStaffOverride()
    {
        await using var db = await SeedGroupAsync();
        var data = new TestDataFactory(db.Context);
        var group = await db.Context.Groups.SingleAsync();
        var globalAdmin = data.Users.Add(data.Users.Normal("global-ban-admin"));
        var groupAdmin = data.Users.Add(data.Users.Normal("force-banned-admin"));
        data.Groups.Membership(group, groupAdmin, GroupRole.GroupAdmin);
        await data.SaveAsync();
        var service = CreateService(db);

        await service.BanUserAsync(globalAdmin.Id, group.Id, new CreateGroupBanDto { UserId = groupAdmin.Id }, force: true);

        Assert.True(await db.Context.GroupBans.AnyAsync(b => b.GroupId == group.Id && b.UserId == groupAdmin.Id && b.RevokedAt == null));

        await service.UnbanUserAsync(globalAdmin.Id, group.Id, groupAdmin.Id, force: true);

        Assert.True(await db.Context.GroupBans.AnyAsync(b => b.GroupId == group.Id && b.UserId == groupAdmin.Id && b.RevokedAt != null));
    }

    private static GroupService CreateService(SqliteTestDb db)
    {
        return new GroupService(
            db.Context,
            new NoopNotificationService(),
            new ModerationAuditService(db.Context));
    }

    private static async Task<SqliteTestDb> SeedGroupAsync(GroupVisibility visibility = GroupVisibility.Public)
    {
        var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("owner"));
        data.Groups.Group(owner, visibility: visibility);
        await data.SaveAsync();
        return db;
    }

    private static CreateGroupPostDto ValidPost(IEnumerable<Guid>? mediaIds = null)
    {
        return new CreateGroupPostDto
        {
            Title = "Post title",
            Content = "Post content",
            MediaIds = mediaIds?.ToList() ?? []
        };
    }
}
