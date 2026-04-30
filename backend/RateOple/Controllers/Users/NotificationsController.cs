using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Extensions;

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
        var result = await _notificationService.GetForUserAsync(User.GetRequiredUserId(), query);
        return Ok(result);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await _notificationService.MarkAsReadAsync(User.GetRequiredUserId(), id);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var count = await _notificationService.MarkAllAsReadAsync(User.GetRequiredUserId());
        return Ok(new { marked = count });
    }
}
