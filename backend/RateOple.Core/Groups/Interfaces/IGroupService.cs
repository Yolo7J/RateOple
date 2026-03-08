using RateOple.Core.Groups.DTOs;

namespace RateOple.Core.Contracts;

public interface IGroupService
{
    Task<GroupSummaryDto> CreateGroupAsync(Guid userId, CreateGroupDto dto);
    Task<PagedGroupsDto> GetGroupsAsync(GroupQueryDto query);
    Task<GroupSummaryDto?> GetGroupByIdAsync(Guid groupId);
    Task JoinGroupAsync(Guid userId, Guid groupId);
    Task LeaveGroupAsync(Guid userId, Guid groupId);
    Task SetMemberRoleAsync(Guid actorUserId, Guid groupId, Guid targetUserId, SetGroupMemberRoleDto dto);
    Task<GroupPostDto> CreatePostAsync(Guid userId, Guid groupId, CreateGroupPostDto dto);
    Task<PagedGroupPostsDto> GetPostsAsync(Guid groupId, int page, int pageSize);
    Task AddPinnedMediaAsync(Guid userId, Guid groupId, Guid mediaId);
    Task<IReadOnlyList<PinnedGroupMediaDto>> GetPinnedMediaAsync(Guid groupId);
}
