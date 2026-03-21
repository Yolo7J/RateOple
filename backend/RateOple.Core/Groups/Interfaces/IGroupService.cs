using RateOple.Core.Groups.DTOs;

namespace RateOple.Core.Contracts;

public interface IGroupService
{
    Task<GroupSummaryDto> CreateGroupAsync(Guid userId, CreateGroupDto dto);
    Task<PagedGroupsDto> GetGroupsAsync(GroupQueryDto query, Guid? viewerId = null);
    Task<GroupSummaryDto?> GetGroupByIdAsync(Guid groupId, Guid? viewerId = null);
    Task<IReadOnlyList<GroupMemberDto>> GetMembersAsync(Guid groupId, Guid actorId);
    Task JoinGroupAsync(Guid userId, Guid groupId);
    Task LeaveGroupAsync(Guid userId, Guid groupId);
    Task SetMemberRoleAsync(Guid actorUserId, Guid groupId, Guid targetUserId, SetGroupMemberRoleDto dto);
    Task<GroupPostDto> CreatePostAsync(Guid userId, Guid groupId, CreateGroupPostDto dto);
    Task<PagedGroupPostsDto> GetPostsAsync(Guid groupId, int page, int pageSize, Guid? viewerId = null);
    Task<GroupPostDto> GetPostByIdAsync(Guid groupId, Guid postId, Guid? viewerId = null);
    Task<IReadOnlyList<GroupPostCommentDto>> GetPostCommentsAsync(Guid groupId, Guid postId, Guid? viewerId = null);
    Task<GroupPostCommentDto> CreatePostCommentAsync(Guid userId, Guid groupId, Guid postId, CreateGroupPostCommentDto dto);
    Task DeletePostCommentAsync(Guid actorId, Guid groupId, Guid postId, Guid commentId);
    Task<GroupPostDto> VotePostAsync(Guid userId, Guid groupId, Guid postId, int value);
    Task<GroupBanDto> BanUserAsync(Guid actorId, Guid groupId, CreateGroupBanDto dto);
    Task UnbanUserAsync(Guid actorId, Guid groupId, Guid userId);
    Task<IReadOnlyList<GroupStaffMessageDto>> GetStaffMessagesAsync(Guid groupId, Guid actorId);
    Task<GroupStaffMessageDto> CreateStaffMessageAsync(Guid userId, Guid groupId, CreateGroupStaffMessageDto dto);
    Task AddPinnedMediaAsync(Guid userId, Guid groupId, Guid mediaId);
    Task<IReadOnlyList<PinnedGroupMediaDto>> GetPinnedMediaAsync(Guid groupId);
}
