using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api/media/{mediaId}/ratings")]
public class RatingsController : ControllerBase
{
    private readonly IRatingService _ratingService;

    public RatingsController(IRatingService ratingService)
    {
        _ratingService = ratingService;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<RatingDto>> RateMedia(Guid mediaId, [FromBody] int value)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        try
        {
            var result = await _ratingService.RateMediaAsync(Guid.Parse(userId), mediaId, value);
            return Ok(result);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete]
    [Authorize]
    public async Task<IActionResult> DeleteRating(Guid mediaId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        await _ratingService.DeleteRatingAsync(Guid.Parse(userId), mediaId);
        return NoContent();
    }

    [HttpGet("summary")]
    public async Task<ActionResult<MediaRatingSummaryDto>> GetSummary(Guid mediaId)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = userIdString != null ? Guid.Parse(userIdString) : null;

        var result = await _ratingService.GetMediaRatingSummaryAsync(mediaId, userId);
        return Ok(result);
    }
}
