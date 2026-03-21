using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Collections.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api/collections")]
public class CollectionsController : ControllerBase
{
    private readonly ICollectionService _collectionService;

    public CollectionsController(ICollectionService collectionService)
    {
        _collectionService = collectionService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedCollectionsDto>> Query([FromQuery] CollectionQueryDto query)
    {
        var data = await _collectionService.QueryAsync(query, GetOptionalUserId());
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionDto>> GetById(Guid id)
    {
        var collection = await _collectionService.GetByIdAsync(id, GetOptionalUserId());
        return collection == null ? NotFound() : Ok(collection);
    }

    [HttpPost]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<CollectionDto>> Create([FromBody] CreateCollectionDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var created = await _collectionService.CreateAsync(userId.Value, dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<CollectionDto>> Update(Guid id, [FromBody] UpdateCollectionDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var updated = await _collectionService.UpdateAsync(userId.Value, id, dto);
            return Ok(updated);
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

    [HttpDelete("{id:guid}")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _collectionService.DeleteAsync(userId.Value, id);
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

    [HttpPost("{id:guid}/items")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<CollectionDto>> AddItem(Guid id, [FromBody] AddCollectionItemDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var updated = await _collectionService.AddItemAsync(userId.Value, id, dto);
            return Ok(updated);
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

    [HttpDelete("{id:guid}/items/{mediaId:guid}")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<CollectionDto>> RemoveItem(Guid id, Guid mediaId)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var updated = await _collectionService.RemoveItemAsync(userId.Value, id, mediaId);
            return Ok(updated);
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

    [HttpPut("{id:guid}/items/reorder")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<CollectionDto>> ReorderItems(Guid id, [FromBody] ReorderCollectionItemsDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var updated = await _collectionService.ReorderItemsAsync(userId.Value, id, dto);
            return Ok(updated);
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

    [HttpPost("{id:guid}/follow")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Follow(Guid id)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _collectionService.FollowAsync(userId.Value, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id:guid}/follow")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Unfollow(Guid id)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        await _collectionService.UnfollowAsync(userId.Value, id);
        return NoContent();
    }

    private Guid? GetRequiredUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }

    private Guid? GetOptionalUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }
}
