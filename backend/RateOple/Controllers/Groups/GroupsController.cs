using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Groups.DTOs;

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
        var result = await _groupService.GetGroupsAsync(query);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupSummaryDto>> GetById(Guid id)
    {
        var group = await _groupService.GetGroupByIdAsync(id);
        return group == null ? NotFound() : Ok(group);
    }

    [HttpPost]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<GroupSummaryDto>> Create([FromBody] CreateGroupDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var created = await _groupService.CreateGroupAsync(userId.Value, dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/join")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Join(Guid id)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _groupService.JoinGroupAsync(userId.Value, id);
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
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _groupService.LeaveGroupAsync(userId.Value, id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id:guid}/members/{userId:guid}/role")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> SetRole(Guid id, Guid userId, [FromBody] SetGroupMemberRoleDto dto)
    {
        var actorId = GetRequiredUserId();
        if (!actorId.HasValue) return Unauthorized();

        try
        {
            await _groupService.SetMemberRoleAsync(actorId.Value, id, userId, dto);
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
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<GroupPostDto>> CreatePost(Guid id, [FromBody] CreateGroupPostDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var post = await _groupService.CreatePostAsync(userId.Value, id, dto);
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
    }

    [HttpGet("{id:guid}/posts")]
    public async Task<ActionResult<PagedGroupPostsDto>> GetPosts(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var posts = await _groupService.GetPostsAsync(id, page, pageSize);
            return Ok(posts);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id:guid}/pinned-media")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> AddPinnedMedia(Guid id, [FromBody] AddPinnedMediaDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _groupService.AddPinnedMediaAsync(userId.Value, id, dto.MediaId);
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

    private Guid? GetRequiredUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }
}
