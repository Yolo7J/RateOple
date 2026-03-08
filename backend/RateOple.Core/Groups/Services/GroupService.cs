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

    public GroupService(ApplicationDbContext context)
    {
        _context = context;
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

    public async Task<PagedGroupsDto> GetGroupsAsync(GroupQueryDto query)
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
            q = q.Where(g => g.Visibility == query.Visibility.Value);

        var total = await q.CountAsync();
        var groups = await q
            .OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new GroupSummaryDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                Visibility = g.Visibility,
                OwnerId = g.OwnerId,
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

    public async Task<GroupSummaryDto?> GetGroupByIdAsync(Guid groupId)
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
                MembersCount = g.Members.Count,
                PostsCount = g.Posts.Count
            })
            .FirstOrDefaultAsync();
    }

    public async Task JoinGroupAsync(Guid userId, Guid groupId)
    {
        var group = await _context.Groups.FirstOrDefaultAsync(g => g.Id == groupId)
            ?? throw new KeyNotFoundException("Group not found.");

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

    public async Task<PagedGroupPostsDto> GetPostsAsync(Guid groupId, int page, int pageSize)
    {
        var exists = await _context.Groups.AnyAsync(g => g.Id == groupId);
        if (!exists)
            throw new KeyNotFoundException("Group not found.");

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

        return new PagedGroupPostsDto
        {
            Items = posts,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
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
