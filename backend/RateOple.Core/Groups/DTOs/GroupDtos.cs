using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;
using RateOple.Core.Validation;

namespace RateOple.Core.Groups.DTOs;

public class CreateGroupDto
{
    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    [EnumDataType(typeof(GroupVisibility))]
    public GroupVisibility Visibility { get; set; } = GroupVisibility.Public;
}

public class GroupQueryDto
{
    [MaxLength(120)]
    public string? Search { get; set; }
    [EnumDataType(typeof(GroupVisibility))]
    public GroupVisibility? Visibility { get; set; }
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public class GroupSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public GroupVisibility Visibility { get; set; }
    public Guid OwnerId { get; set; }
    public GroupRole? ViewerRole { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public int MembersCount { get; set; }
    public int PostsCount { get; set; }
}

public class GroupMemberDto
{
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public GroupRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
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
    [EnumDataType(typeof(GroupRole))]
    public GroupRole Role { get; set; }
}

public class TransferGroupOwnershipDto
{
    [NotEmptyGuid]
    public Guid NewOwnerId { get; set; }
}

public class CreateGroupPostDto : IValidatableObject
{
    [Required]
    [MaxLength(160)]
    public string Title { get; set; } = string.Empty;
    [Required]
    [MaxLength(8000)]
    public string Content { get; set; } = string.Empty;
    public List<Guid> MediaIds { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MediaIds.Any(id => id == Guid.Empty))
            yield return new ValidationResult("Media ids must not contain empty GUID values.", [nameof(MediaIds)]);

        if (MediaIds.Distinct().Count() != MediaIds.Count)
            yield return new ValidationResult("Media ids must not contain duplicates.", [nameof(MediaIds)]);
    }
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
    public string? AuthorName { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int Upvotes { get; set; }
    public int Downvotes { get; set; }
    public int CommentCount { get; set; }
    public int? UserVote { get; set; }
    public List<GroupPostMediaDto> Media { get; set; } = [];
}

public class PagedGroupPostsDto
{
    public List<GroupPostDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class CreateGroupPostCommentDto
{
    [Required]
    [MaxLength(4000)]
    public string Content { get; set; } = string.Empty;
    [NotEmptyGuid]
    public Guid? ParentCommentId { get; set; }
}

public class GroupPostCommentDto
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid? AuthorId { get; set; }
    public string? AuthorName { get; set; }
    public Guid? UserId { get; set; }
    public string? Username { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid? ParentCommentId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GroupPostVoteDto
{
    [Range(-1, 1)]
    public int Value { get; set; }
}

public class GroupBanDto
{
    public Guid UserId { get; set; }
    public Guid BannedById { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

public class CreateGroupBanDto
{
    [NotEmptyGuid]
    public Guid UserId { get; set; }
    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class GroupStaffMessageDto
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid AuthorId { get; set; }
    public string? AuthorName { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateGroupStaffMessageDto
{
    [Required]
    [MaxLength(4000)]
    public string Content { get; set; } = string.Empty;
}

public class AddPinnedMediaDto
{
    [NotEmptyGuid]
    public Guid MediaId { get; set; }
}

public class PinnedGroupMediaDto
{
    public Guid MediaId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public DateTime AddedAt { get; set; }
}
