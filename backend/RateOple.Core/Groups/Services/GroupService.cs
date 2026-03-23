using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Groups.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Groups.Services;

public class GroupService : IGroupService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public GroupService(ApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<GroupSummaryDto> CreateGroupAsync(Guid userId, CreateGroupDto dto)
    {
        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Group name is required.");

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = dto.Description?.Trim(),
            Visibility = dto.Visibility,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Groups.Add(group);
        _context.GroupMemberships.Add(new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = group.Id,
            UserId = userId,
            Role = GroupRole.Owner,
            JoinedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return await GetRequiredGroupAsync(group.Id);
    }

    public async Task<PagedGroupsDto> GetGroupsAsync(GroupQueryDto query, Guid? viewerId = null)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 20 : Math.Min(query.PageSize, 100);

        var q = _context.Groups.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(g => g.Name.ToLower().Contains(term));
        }

        if (query.Visibility.HasValue)
        {
            q = q.Where(g => g.Visibility == query.Visibility.Value);
        }
        else if (viewerId.HasValue)
        {
            var followedOwnerIds = _context.Follows
                .AsNoTracking()
                .Where(f => f.FollowerId == viewerId.Value)
                .Select(f => f.FollowingId);

            q = q.Where(g =>
                g.Visibility == GroupVisibility.Public ||
                g.OwnerId == viewerId.Value ||
                g.Members.Any(m => m.UserId == viewerId.Value) ||
                followedOwnerIds.Contains(g.OwnerId));
        }
        else
        {
            q = q.Where(g => g.Visibility == GroupVisibility.Public);
        }

        var total = await q.CountAsync();
        var groups = await q
            .OrderByDescending(g => g.Members.Count)
            .ThenByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new GroupSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Visibility = g.Visibility,
                OwnerId = g.OwnerId,
                ViewerRole = viewerId.HasValue
                    ? g.Members.Where(m => m.UserId == viewerId.Value).Select(m => (GroupRole?)m.Role).FirstOrDefault()
                    : null,
                CreatedAt = g.CreatedAt,
                MembersCount = g.Members.Count,
                PostsCount = g.Posts.Count
            })
            .ToListAsync();

        return new PagedGroupsDto
        {
            Items = groups,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<GroupSummaryDto?> GetGroupByIdAsync(Guid groupId, Guid? viewerId = null)
    {
        var group = await _context.Groups
            .AsNoTracking()
            .Where(g => g.Id == groupId)
            .Select(g => new GroupSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Visibility = g.Visibility,
                OwnerId = g.OwnerId,
                ViewerRole = viewerId.HasValue
                    ? g.Members.Where(m => m.UserId == viewerId.Value).Select(m => (GroupRole?)m.Role).FirstOrDefault()
                    : null,
                CreatedAt = g.CreatedAt,
                MembersCount = g.Members.Count,
                PostsCount = g.Posts.Count
            })
            .FirstOrDefaultAsync();

        if (group == null)
            return null;

        if (group.Visibility == GroupVisibility.Private && viewerId.HasValue)
        {
            var canView = await _context.GroupMemberships
                .AsNoTracking()
                .AnyAsync(m => m.GroupId == groupId && m.UserId == viewerId.Value);

            if (group.OwnerId != viewerId.Value && !canView)
                return null;
        }
        else if (group.Visibility == GroupVisibility.Private)
        {
            return null;
        }

        return group;
    }

    public async Task<IReadOnlyList<GroupMemberDto>> GetMembersAsync(Guid groupId, Guid actorId)
    {
        var actorRole = await GetMembershipRoleAsync(actorId, groupId);
        if (actorRole != GroupRole.Owner && actorRole != GroupRole.Admin)
            throw new UnauthorizedAccessException("Insufficient permission to view members.");

        var exists = await _context.Groups.AnyAsync(g => g.Id == groupId);
        if (!exists)
            throw new KeyNotFoundException("Group not found.");

        return await _context.GroupMemberships
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderByDescending(m => m.Role)
            .ThenByDescending(m => m.JoinedAt)
            .Select(m => new GroupMemberDto
            {
                UserId = m.UserId,
                UserName = m.User.UserName,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            })
            .ToListAsync();
    }

    public async Task JoinGroupAsync(Guid userId, Guid groupId)
    {
        var group = await _context.Groups.FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        await EnsureNotBannedAsync(groupId, userId);

        var exists = await _context.GroupMemberships
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (exists)
            return;

        if (group.Visibility == GroupVisibility.Private)
            throw new UnauthorizedAccessException("Private groups cannot be joined directly.");

        _context.GroupMemberships.Add(new GroupMembership
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Role = GroupRole.Member,
            JoinedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    public async Task LeaveGroupAsync(Guid userId, Guid groupId)
    {
        var membership = await _context.GroupMemberships
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (membership == null)
            return;

        if (membership.Role == GroupRole.Owner)
            throw new InvalidOperationException("Group owner cannot leave the group.");

        _context.GroupMemberships.Remove(membership);
        await _context.SaveChangesAsync();
    }

    public async Task SetMemberRoleAsync(Guid actorUserId, Guid groupId, Guid targetUserId, SetGroupMemberRoleDto dto)
    {
        if (dto.Role == GroupRole.Owner)
            throw new ArgumentException("Owner role is reserved.");

        var actorRole = await GetMembershipRoleAsync(actorUserId, groupId);
        if (actorRole != GroupRole.Owner && actorRole != GroupRole.Admin)
            throw new UnauthorizedAccessException("Insufficient permission to manage roles.");

        var targetMembership = await _context.GroupMemberships
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == targetUserId)
            ?? throw new KeyNotFoundException("Target user is not a group member.");

        if (targetMembership.Role == GroupRole.Owner)
            throw new InvalidOperationException("Owner role cannot be changed.");

        if (actorRole == GroupRole.Admin)
        {
            if (targetMembership.Role == GroupRole.Admin)
                throw new UnauthorizedAccessException("Admins cannot modify other admins.");
            if (dto.Role == GroupRole.Admin)
                throw new UnauthorizedAccessException("Only the owner can assign admins.");
        }

        targetMembership.Role = dto.Role;
        await _context.SaveChangesAsync();
    }

    public async Task<GroupPostDto> CreatePostAsync(Guid userId, Guid groupId, CreateGroupPostDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new ArgumentException("Post title is required.");
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Post content is required.");

        var group = await _context.Groups.FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        await EnsureNotBannedAsync(groupId, userId);

        var isMember = await _context.GroupMemberships
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (!isMember)
            throw new UnauthorizedAccessException("Only group members can post.");

        var post = new GroupPost
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = userId,
            Title = dto.Title.Trim(),
            Content = dto.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupPosts.Add(post);

        var mediaIds = dto.MediaIds.Distinct().ToList();
        if (mediaIds.Count > 0)
        {
            var existingMediaIds = await _context.Media
                .AsNoTracking()
                .Where(m => mediaIds.Contains(m.Id) && !m.IsDeleted)
                .Select(m => m.Id)
                .ToListAsync();

            var links = existingMediaIds.Select(mediaId => new PostMedia
            {
                PostId = post.Id,
                MediaId = mediaId
            });

            _context.PostMediaLinks.AddRange(links);
        }

        await _context.SaveChangesAsync();
        return await GetRequiredPostAsync(post.Id);
    }

    public async Task<PagedGroupPostsDto> GetPostsAsync(Guid groupId, int page, int pageSize, Guid? viewerId = null)
    {
        var group = await _context.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        if (group.Visibility == GroupVisibility.Private)
            await EnsureCanViewGroupAsync(groupId, viewerId);

        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        var query = _context.GroupPosts
            .AsNoTracking()
            .Where(p => p.GroupId == groupId);

        var total = await query.CountAsync();
        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new GroupPostDto
            {
                Id = p.Id,
                GroupId = p.GroupId,
                AuthorId = p.UserId,
                Title = p.Title,
                Content = p.Content,
                CreatedAt = p.CreatedAt,
                Media = p.MediaLinks
                    .Select(x => new GroupPostMediaDto
                    {
                        MediaId = x.MediaId,
                        Title = x.Media.Title,
                        CoverUrl = x.Media.CoverUrl
                    })
                    .ToList()
            })
            .ToListAsync();

        if (posts.Count > 0)
        {
            var postIds = posts.Select(p => p.Id).ToList();

            var voteCounts = await _context.GroupPostVotes
                .AsNoTracking()
                .Where(v => postIds.Contains(v.GroupPostId))
                .GroupBy(v => v.GroupPostId)
                .Select(g => new
                {
                    PostId = g.Key,
                    Upvotes = g.Count(x => x.Value == 1),
                    Downvotes = g.Count(x => x.Value == -1)
                })
                .ToDictionaryAsync(x => x.PostId, x => x);

            var commentCounts = await _context.Comments
                .AsNoTracking()
                .Where(c => c.GroupPostId.HasValue && postIds.Contains(c.GroupPostId.Value))
                .GroupBy(c => c.GroupPostId!.Value)
                .Select(g => new { PostId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.PostId, x => x.Count);

            Dictionary<Guid, int>? userVotes = null;
            if (viewerId.HasValue)
            {
                userVotes = await _context.GroupPostVotes
                    .AsNoTracking()
                    .Where(v => v.UserId == viewerId.Value && postIds.Contains(v.GroupPostId))
                    .ToDictionaryAsync(v => v.GroupPostId, v => v.Value);
            }

            foreach (var post in posts)
            {
                if (voteCounts.TryGetValue(post.Id, out var votes))
                {
                    post.Upvotes = votes.Upvotes;
                    post.Downvotes = votes.Downvotes;
                }

                if (commentCounts.TryGetValue(post.Id, out var count))
                    post.CommentCount = count;

                if (userVotes != null && userVotes.TryGetValue(post.Id, out var vote))
                    post.UserVote = vote;
            }
        }

        return new PagedGroupPostsDto
        {
            Items = posts,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<GroupPostDto> GetPostByIdAsync(Guid groupId, Guid postId, Guid? viewerId = null)
    {
        var group = await _context.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        if (group.Visibility == GroupVisibility.Private)
            await EnsureCanViewGroupAsync(groupId, viewerId);

        var post = await _context.GroupPosts
            .AsNoTracking()
            .Where(p => p.GroupId == groupId && p.Id == postId)
            .Select(p => new GroupPostDto
            {
                Id = p.Id,
                GroupId = p.GroupId,
                AuthorId = p.UserId,
                Title = p.Title,
                Content = p.Content,
                CreatedAt = p.CreatedAt,
                Media = p.MediaLinks
                    .Select(x => new GroupPostMediaDto
                    {
                        MediaId = x.MediaId,
                        Title = x.Media.Title,
                        CoverUrl = x.Media.CoverUrl
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (post == null)
            throw new KeyNotFoundException("Post not found.");

        post.Upvotes = await _context.GroupPostVotes.CountAsync(v => v.GroupPostId == postId && v.Value == 1);
        post.Downvotes = await _context.GroupPostVotes.CountAsync(v => v.GroupPostId == postId && v.Value == -1);
        post.CommentCount = await _context.Comments.CountAsync(c => c.GroupPostId == postId);

        if (viewerId.HasValue)
        {
            post.UserVote = await _context.GroupPostVotes
                .AsNoTracking()
                .Where(v => v.GroupPostId == postId && v.UserId == viewerId.Value)
                .Select(v => (int?)v.Value)
                .FirstOrDefaultAsync();
        }

        return post;
    }

    public async Task<IReadOnlyList<GroupPostCommentDto>> GetPostCommentsAsync(Guid groupId, Guid postId, Guid? viewerId = null)
    {
        var group = await _context.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        if (group.Visibility == GroupVisibility.Private)
            await EnsureCanViewGroupAsync(groupId, viewerId);

        var exists = await _context.GroupPosts
            .AsNoTracking()
            .AnyAsync(p => p.Id == postId && p.GroupId == groupId);

        if (!exists)
            throw new KeyNotFoundException("Post not found.");

        return await _context.Comments
            .AsNoTracking()
            .Where(c => c.GroupPostId == postId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new GroupPostCommentDto
            {
                Id = c.Id,
                PostId = postId,
                AuthorId = c.UserId,
                AuthorName = c.User != null ? c.User.UserName : null,
                UserId = c.UserId,
                Username = c.User != null ? c.User.UserName : null,
                DisplayName = c.User != null && c.User.Profile != null ? c.User.Profile.DisplayName : null,
                AvatarUrl = c.User != null && c.User.Profile != null ? c.User.Profile.AvatarUrl : null,
                Content = c.Content,
                ParentCommentId = c.ParentCommentId,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<GroupPostCommentDto> CreatePostCommentAsync(
        Guid userId,
        Guid groupId,
        Guid postId,
        CreateGroupPostCommentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Comment content is required.");

        await EnsureNotBannedAsync(groupId, userId);

        var group = await _context.Groups
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        if (group.Visibility == GroupVisibility.Private)
            await EnsureCanViewGroupAsync(groupId, userId);

        var isMember = await _context.GroupMemberships
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);

        if (!isMember)
            throw new UnauthorizedAccessException("Only group members can comment.");

        var postExists = await _context.GroupPosts
            .AnyAsync(p => p.Id == postId && p.GroupId == groupId);

        if (!postExists)
            throw new KeyNotFoundException("Post not found.");

        if (dto.ParentCommentId.HasValue)
        {
            var parentExists = await _context.Comments
                .AnyAsync(c => c.Id == dto.ParentCommentId.Value && c.GroupPostId == postId);
            if (!parentExists)
                throw new ArgumentException("Parent comment is invalid.");
        }

        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            Content = dto.Content.Trim(),
            UserId = userId,
            ParentType = CommentParentType.GroupPost,
            GroupPostId = postId,
            ParentCommentId = dto.ParentCommentId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();

        var author = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.UserName,
                DisplayName = u.Profile != null ? u.Profile.DisplayName : null,
                AvatarUrl = u.Profile != null ? u.Profile.AvatarUrl : null
            })
            .FirstOrDefaultAsync();

        return new GroupPostCommentDto
        {
            Id = comment.Id,
            PostId = postId,
            AuthorId = userId,
            AuthorName = author?.UserName,
            UserId = userId,
            Username = author?.UserName,
            DisplayName = author?.DisplayName,
            AvatarUrl = author?.AvatarUrl,
            Content = comment.Content,
            ParentCommentId = comment.ParentCommentId,
            CreatedAt = comment.CreatedAt
        };
    }

    public async Task DeletePostCommentAsync(Guid actorId, Guid groupId, Guid postId, Guid commentId)
    {
        var comment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.GroupPostId == postId)
            ?? throw new KeyNotFoundException("Comment not found.");

        if (comment.UserId != actorId)
        {
            var role = await GetMembershipRoleAsync(actorId, groupId);
            if (role != GroupRole.Owner && role != GroupRole.Admin && role != GroupRole.Moderator)
                throw new UnauthorizedAccessException("Insufficient permission to delete comment.");

            if (comment.UserId.HasValue && comment.UserId.Value != actorId)
            {
                await _notificationService.CreateAsync(
                    comment.UserId.Value,
                    NotificationType.CommentRemoved,
                    comment.Id);
            }
        }

        _context.Comments.Remove(comment);
        await _context.SaveChangesAsync();
    }

    public async Task<GroupPostDto> VotePostAsync(Guid userId, Guid groupId, Guid postId, int value)
    {
        if (value is < -1 or > 1)
            throw new ArgumentException("Vote value must be -1, 0, or 1.");

        await EnsureNotBannedAsync(groupId, userId);

        var group = await _context.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

        if (group.Visibility == GroupVisibility.Private)
            await EnsureCanViewGroupAsync(groupId, userId);

        var isMember = await _context.GroupMemberships
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);
        if (!isMember)
            throw new UnauthorizedAccessException("Only group members can vote.");

        var postExists = await _context.GroupPosts
            .AnyAsync(p => p.Id == postId && p.GroupId == groupId);
        if (!postExists)
            throw new KeyNotFoundException("Post not found.");

        var existing = await _context.GroupPostVotes
            .FirstOrDefaultAsync(v => v.GroupPostId == postId && v.UserId == userId);

        if (value == 0)
        {
            if (existing != null)
                _context.GroupPostVotes.Remove(existing);
        }
        else if (existing == null)
        {
            _context.GroupPostVotes.Add(new GroupPostVote
            {
                GroupPostId = postId,
                UserId = userId,
                Value = value,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.Value = value;
        }

        await _context.SaveChangesAsync();
        return await GetPostByIdAsync(groupId, postId, userId);
    }

    public async Task<GroupBanDto> BanUserAsync(Guid actorId, Guid groupId, CreateGroupBanDto dto)
    {
        if (dto.UserId == Guid.Empty)
            throw new ArgumentException("Target user is required.");

        var actorRole = await GetMembershipRoleAsync(actorId, groupId);
        if (actorRole != GroupRole.Owner && actorRole != GroupRole.Admin)
            throw new UnauthorizedAccessException("Insufficient permission to ban users.");

        var targetMembership = await _context.GroupMemberships
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == dto.UserId);

        if (targetMembership != null)
        {
            if (targetMembership.Role == GroupRole.Owner)
                throw new InvalidOperationException("Owner cannot be banned.");

            if (actorRole == GroupRole.Admin && targetMembership.Role == GroupRole.Admin)
                throw new UnauthorizedAccessException("Admins cannot ban other admins.");

            _context.GroupMemberships.Remove(targetMembership);
        }

        var existingBan = await _context.GroupBans
            .FirstOrDefaultAsync(b => b.GroupId == groupId && b.UserId == dto.UserId && b.RevokedAt == null);

        if (existingBan != null)
            return MapBan(existingBan);

        var ban = new GroupBan
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            UserId = dto.UserId,
            BannedById = actorId,
            Reason = dto.Reason?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupBans.Add(ban);
        await _context.SaveChangesAsync();

        await _notificationService.CreateAsync(dto.UserId, NotificationType.GroupBan, ban.Id);

        return MapBan(ban);
    }

    public async Task UnbanUserAsync(Guid actorId, Guid groupId, Guid userId)
    {
        var actorRole = await GetMembershipRoleAsync(actorId, groupId);
        if (actorRole != GroupRole.Owner && actorRole != GroupRole.Admin)
            throw new UnauthorizedAccessException("Insufficient permission to unban users.");

        var ban = await _context.GroupBans
            .FirstOrDefaultAsync(b => b.GroupId == groupId && b.UserId == userId && b.RevokedAt == null)
            ?? throw new KeyNotFoundException("Ban not found.");

        ban.RevokedAt = DateTime.UtcNow;
        ban.RevokedById = actorId;
        await _context.SaveChangesAsync();

        await _notificationService.CreateAsync(userId, NotificationType.GroupUnban, ban.Id);
    }

    public async Task<IReadOnlyList<GroupStaffMessageDto>> GetStaffMessagesAsync(Guid groupId, Guid actorId)
    {
        var role = await GetMembershipRoleAsync(actorId, groupId);
        if (role != GroupRole.Owner && role != GroupRole.Admin && role != GroupRole.Moderator)
            throw new UnauthorizedAccessException("Insufficient permission to view staff messages.");

        var exists = await _context.Groups.AnyAsync(g => g.Id == groupId);
        if (!exists)
            throw new KeyNotFoundException("Group not found.");

        return await _context.GroupStaffMessages
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new GroupStaffMessageDto
            {
                Id = m.Id,
                GroupId = m.GroupId,
                AuthorId = m.AuthorId,
                AuthorName = m.Author.UserName,
                Content = m.Content,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<GroupStaffMessageDto> CreateStaffMessageAsync(Guid userId, Guid groupId, CreateGroupStaffMessageDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new ArgumentException("Message content is required.");

        var role = await GetMembershipRoleAsync(userId, groupId);
        if (role != GroupRole.Owner && role != GroupRole.Admin && role != GroupRole.Moderator)
            throw new UnauthorizedAccessException("Insufficient permission to send staff messages.");

        var exists = await _context.Groups.AnyAsync(g => g.Id == groupId);
        if (!exists)
            throw new KeyNotFoundException("Group not found.");

        var message = new GroupStaffMessage
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            AuthorId = userId,
            Content = dto.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupStaffMessages.Add(message);
        await _context.SaveChangesAsync();

        return new GroupStaffMessageDto
        {
            Id = message.Id,
            GroupId = groupId,
            AuthorId = userId,
            AuthorName = await _context.Users.Where(u => u.Id == userId).Select(u => u.UserName).FirstOrDefaultAsync(),
            Content = message.Content,
            CreatedAt = message.CreatedAt
        };
    }

    public async Task AddPinnedMediaAsync(Guid userId, Guid groupId, Guid mediaId)
    {
        var role = await GetMembershipRoleAsync(userId, groupId);
        if (role != GroupRole.Owner && role != GroupRole.Admin && role != GroupRole.Moderator)
            throw new UnauthorizedAccessException("Insufficient permission to pin media.");

        var mediaExists = await _context.Media.AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!mediaExists)
            throw new KeyNotFoundException("Media not found.");

        var linkExists = await _context.GroupMediaLinks
            .AnyAsync(x => x.GroupId == groupId && x.MediaId == mediaId);

        if (linkExists)
            return;

        _context.GroupMediaLinks.Add(new GroupMedia
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            MediaId = mediaId,
            AddedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<PinnedGroupMediaDto>> GetPinnedMediaAsync(Guid groupId)
    {
        var exists = await _context.Groups.AnyAsync(g => g.Id == groupId);
        if (!exists)
            throw new KeyNotFoundException("Group not found.");

        return await _context.GroupMediaLinks
            .AsNoTracking()
            .Where(x => x.GroupId == groupId)
            .OrderByDescending(x => x.AddedAt)
            .Select(x => new PinnedGroupMediaDto
            {
                MediaId = x.MediaId,
                Title = x.Media.Title,
                CoverUrl = x.Media.CoverUrl,
                AddedAt = x.AddedAt
            })
            .ToListAsync();
    }

    private async Task<GroupRole> GetMembershipRoleAsync(Guid userId, Guid groupId)
    {
        var role = await _context.GroupMemberships
            .Where(m => m.GroupId == groupId && m.UserId == userId)
            .Select(m => (GroupRole?)m.Role)
            .FirstOrDefaultAsync();

        if (!role.HasValue)
            throw new UnauthorizedAccessException("User is not a group member.");

        return role.Value;
    }

    private async Task EnsureNotBannedAsync(Guid groupId, Guid userId)
    {
        var banned = await _context.GroupBans
            .AsNoTracking()
            .AnyAsync(b => b.GroupId == groupId && b.UserId == userId && b.RevokedAt == null);

        if (banned)
            throw new UnauthorizedAccessException("You are banned from this group.");
    }

    private async Task EnsureCanViewGroupAsync(Guid groupId, Guid? viewerId)
    {
        if (!viewerId.HasValue)
            throw new UnauthorizedAccessException("Private group access requires membership.");

        var isMember = await _context.GroupMemberships
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == groupId && m.UserId == viewerId.Value);

        var isOwner = await _context.Groups
            .AsNoTracking()
            .AnyAsync(g => g.Id == groupId && g.OwnerId == viewerId.Value);

        if (!isMember && !isOwner)
            throw new UnauthorizedAccessException("You are not a member of this group.");
    }

    private static GroupBanDto MapBan(GroupBan ban) => new()
    {
        UserId = ban.UserId,
        BannedById = ban.BannedById,
        Reason = ban.Reason,
        CreatedAt = ban.CreatedAt,
        RevokedAt = ban.RevokedAt
    };

    private async Task<GroupSummaryDto> GetRequiredGroupAsync(Guid groupId)
    {
        return await _context.Groups
            .AsNoTracking()
            .Where(g => g.Id == groupId)
            .Select(g => new GroupSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Visibility = g.Visibility,
                OwnerId = g.OwnerId,
                CreatedAt = g.CreatedAt,
                MembersCount = g.Members.Count,
                PostsCount = g.Posts.Count
            })
            .FirstAsync();
    }

    private async Task<GroupPostDto> GetRequiredPostAsync(Guid postId)
    {
        return await _context.GroupPosts
            .AsNoTracking()
            .Where(p => p.Id == postId)
            .Select(p => new GroupPostDto
            {
                Id = p.Id,
                GroupId = p.GroupId,
                AuthorId = p.UserId,
                Title = p.Title,
                Content = p.Content,
                CreatedAt = p.CreatedAt,
                Upvotes = 0,
                Downvotes = 0,
                CommentCount = 0,
                Media = p.MediaLinks
                    .Select(x => new GroupPostMediaDto
                    {
                        MediaId = x.MediaId,
                        Title = x.Media.Title,
                        CoverUrl = x.Media.CoverUrl
                    })
                    .ToList()
            })
            .FirstAsync();
    }
}
