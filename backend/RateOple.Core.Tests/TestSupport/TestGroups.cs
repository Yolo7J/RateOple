using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestGroups
{
    private readonly ApplicationDbContext _context;

    public TestGroups(ApplicationDbContext context)
    {
        _context = context;
    }

    public Group Group(User owner, string name = "Test Group", GroupVisibility visibility = GroupVisibility.Public)
    {
        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = $"{name} description",
            Visibility = visibility,
            OwnerId = owner.Id,
            CreatedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);
        Membership(group, owner, GroupRole.Owner);
        return group;
    }

    public GroupMembership Membership(Group group, User user, GroupRole role = GroupRole.Member)
    {
        var membership = new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = user.Id,
            Role = role,
            JoinedAt = DateTime.UtcNow
        };

        _context.GroupMemberships.Add(membership);
        return membership;
    }

    public GroupBan Ban(Group group, User user, User bannedBy, string? reason = "rule violation")
    {
        var ban = new GroupBan
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = user.Id,
            BannedById = bannedBy.Id,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupBans.Add(ban);
        return ban;
    }

    public GroupPost Post(Group group, User author, string title = "Group post")
    {
        var post = new GroupPost
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = author.Id,
            Title = title,
            Content = $"{title} content",
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupPosts.Add(post);
        return post;
    }
}
