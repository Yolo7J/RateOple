using RateOple.Constants.Enums;

namespace RateOple.Core.Groups.DTOs;

public class CreateGroupDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public GroupVisibility Visibility { get; set; } = GroupVisibility.Public;
}

public class GroupQueryDto
{
    public string? Search { get; set; }
    public GroupVisibility? Visibility { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GroupSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public GroupVisibility Visibility { get; set; }
    public Guid OwnerId { get; set; }
    public int MembersCount { get; set; }
    public int PostsCount { get; set; }
}

public class PagedGroupsDto
{
    public List<GroupSummaryDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class SetGroupMemberRoleDto
{
    public GroupRole Role { get; set; }
}

public class CreateGroupPostDto
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<Guid> MediaIds { get; set; } = [];
}

public class GroupPostMediaDto
{
    public Guid MediaId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
}

public class GroupPostDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid? AuthorId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<GroupPostMediaDto> Media { get; set; } = [];
}

public class PagedGroupPostsDto
{
    public List<GroupPostDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class AddPinnedMediaDto
{
    public Guid MediaId { get; set; }
}

public class PinnedGroupMediaDto
{
    public Guid MediaId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public DateTime AddedAt { get; set; }
}
