using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedNotificationsDto>> Get([FromQuery] NotificationQueryDto query)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var result = await _notificationService.GetForUserAsync(userId.Value, query);
        return Ok(result);
    }

    [HttpPost("{id:guid}/read")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _notificationService.MarkAsReadAsync(userId.Value, id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("read-all")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var count = await _notificationService.MarkAllAsReadAsync(userId.Value);
        return Ok(new { marked = count });
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }
}
