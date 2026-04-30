using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Collections.DTOs;
using RateOple.Extensions;

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
        var data = await _collectionService.QueryAsync(query, User.GetUserIdOrNull());
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionDto>> GetById(Guid id)
    {
        var collection = await _collectionService.GetByIdAsync(id, User.GetUserIdOrNull());
        return collection == null ? NotFound() : Ok(collection);
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<CollectionDto>> Create([FromBody] CreateCollectionDto dto)
    {
        var created = await _collectionService.CreateAsync(User.GetRequiredUserId(), dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<CollectionDto>> Update(Guid id, [FromBody] UpdateCollectionDto dto)
    {
        var updated = await _collectionService.UpdateAsync(User.GetRequiredUserId(), id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _collectionService.DeleteAsync(User.GetRequiredUserId(), id);
        return NoContent();
    }

    [HttpPost("{id:guid}/items")]
    [Authorize]
    public async Task<ActionResult<CollectionDto>> AddItem(Guid id, [FromBody] AddCollectionItemDto dto)
    {
        var updated = await _collectionService.AddItemAsync(User.GetRequiredUserId(), id, dto);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}/items/{mediaId:guid}")]
    [Authorize]
    public async Task<ActionResult<CollectionDto>> RemoveItem(Guid id, Guid mediaId)
    {
        var updated = await _collectionService.RemoveItemAsync(User.GetRequiredUserId(), id, mediaId);
        return Ok(updated);
    }

    [HttpPut("{id:guid}/items/reorder")]
    [Authorize]
    public async Task<ActionResult<CollectionDto>> ReorderItems(Guid id, [FromBody] ReorderCollectionItemsDto dto)
    {
        var updated = await _collectionService.ReorderItemsAsync(User.GetRequiredUserId(), id, dto);
        return Ok(updated);
    }

    [HttpPost("{id:guid}/follow")]
    [Authorize]
    public async Task<IActionResult> Follow(Guid id)
    {
        await _collectionService.FollowAsync(User.GetRequiredUserId(), id);
        return NoContent();
    }

    [HttpDelete("{id:guid}/follow")]
    [Authorize]
    public async Task<IActionResult> Unfollow(Guid id)
    {
        await _collectionService.UnfollowAsync(User.GetRequiredUserId(), id);
        return NoContent();
    }
}
