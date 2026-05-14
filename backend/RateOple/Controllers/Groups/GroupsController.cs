using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Core.Groups.DTOs;
using RateOple.Extensions;

namespace RateOple.Controllers;

[ApiController]
[Route("api/groups")]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;

    public GroupsController(IGroupService groupService)
    {
        _groupService = groupService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedGroupsDto>> GetGroups([FromQuery] GroupQueryDto query)
    {
        var result = await _groupService.GetGroupsAsync(query, User.GetUserIdOrNull());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupSummaryDto>> GetById(Guid id)
    {
        var group = await _groupService.GetGroupByIdAsync(id, User.GetUserIdOrNull());
        return group == null ? NotFound() : Ok(group);
    }

    [HttpGet("{id:guid}/members")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<GroupMemberDto>>> GetMembers(Guid id)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var members = await _groupService.GetMembersAsync(id, userId);
            return Ok(members);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<GroupSummaryDto>> Create([FromBody] CreateGroupDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var created = await _groupService.CreateGroupAsync(userId, dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/join")]
    [Authorize]
    public async Task<IActionResult> Join(Guid id)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            await _groupService.JoinGroupAsync(userId, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}/leave")]
    [Authorize]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            await _groupService.LeaveGroupAsync(userId, id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/members/{userId:guid}/role")]
    [Authorize]
    public async Task<IActionResult> SetRole(Guid id, Guid userId, [FromBody] SetGroupMemberRoleDto dto)
    {
        var actorId = User.GetRequiredUserId();

        try
        {
            await _groupService.SetMemberRoleAsync(actorId, id, userId, dto);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/ownership")]
    [Authorize]
    public async Task<IActionResult> TransferOwnership(Guid id, [FromBody] TransferGroupOwnershipDto dto)
    {
        var actorId = User.GetRequiredUserId();
        var force = User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin);

        try
        {
            await _groupService.TransferOwnershipAsync(actorId, id, dto.NewOwnerId, force);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/posts")]
    [Authorize]
    public async Task<ActionResult<GroupPostDto>> CreatePost(Guid id, [FromBody] CreateGroupPostDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var post = await _groupService.CreatePostAsync(userId, id, dto);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:guid}/posts")]
    public async Task<ActionResult<PagedGroupPostsDto>> GetPosts(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var posts = await _groupService.GetPostsAsync(id, page, pageSize, User.GetUserIdOrNull());
            return Ok(posts);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}/posts/{postId:guid}")]
    public async Task<ActionResult<GroupPostDto>> GetPostById(Guid id, Guid postId)
    {
        try
        {
            var post = await _groupService.GetPostByIdAsync(id, postId, User.GetUserIdOrNull());
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/posts/{postId:guid}/vote")]
    [Authorize]
    public async Task<ActionResult<GroupPostDto>> VotePost(Guid id, Guid postId, [FromBody] GroupPostVoteDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var post = await _groupService.VotePostAsync(userId, id, postId, dto.Value);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:guid}/posts/{postId:guid}/comments")]
    public async Task<ActionResult<IReadOnlyList<GroupPostCommentDto>>> GetPostComments(Guid id, Guid postId)
    {
        try
        {
            var comments = await _groupService.GetPostCommentsAsync(id, postId, User.GetUserIdOrNull());
            return Ok(comments);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/posts/{postId:guid}/comments")]
    [Authorize]
    public async Task<ActionResult<GroupPostCommentDto>> CreatePostComment(
        Guid id,
        Guid postId,
        [FromBody] CreateGroupPostCommentDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var comment = await _groupService.CreatePostCommentAsync(userId, id, postId, dto);
            return Ok(comment);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}/posts/{postId:guid}/comments/{commentId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeletePostComment(Guid id, Guid postId, Guid commentId)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            await _groupService.DeletePostCommentAsync(userId, id, postId, commentId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/bans")]
    [Authorize]
    public async Task<ActionResult<GroupBanDto>> BanUser(Guid id, [FromBody] CreateGroupBanDto dto)
    {
        var userId = User.GetRequiredUserId();
        var force = User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin);

        try
        {
            var ban = await _groupService.BanUserAsync(userId, id, dto, force);
            return Ok(ban);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}/bans/{userId:guid}")]
    [Authorize]
    public async Task<IActionResult> UnbanUser(Guid id, Guid userId)
    {
        var actorId = User.GetRequiredUserId();
        var force = User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin);

        try
        {
            await _groupService.UnbanUserAsync(actorId, id, userId, force);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:guid}/staff/messages")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<GroupStaffMessageDto>>> GetStaffMessages(Guid id)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var messages = await _groupService.GetStaffMessagesAsync(id, userId);
            return Ok(messages);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/staff/messages")]
    [Authorize]
    public async Task<ActionResult<GroupStaffMessageDto>> CreateStaffMessage(
        Guid id,
        [FromBody] CreateGroupStaffMessageDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            var message = await _groupService.CreateStaffMessageAsync(userId, id, dto);
            return Ok(message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/pinned-media")]
    [Authorize]
    public async Task<IActionResult> AddPinnedMedia(Guid id, [FromBody] AddPinnedMediaDto dto)
    {
        var userId = User.GetRequiredUserId();

        try
        {
            await _groupService.AddPinnedMediaAsync(userId, id, dto.MediaId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:guid}/pinned-media")]
    public async Task<ActionResult<IReadOnlyList<PinnedGroupMediaDto>>> GetPinnedMedia(Guid id)
    {
        try
        {
            var media = await _groupService.GetPinnedMediaAsync(id);
            return Ok(media);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

}
