using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api")]
public class RatingsController : ControllerBase
{
    private readonly IRatingService _ratingService;

    public RatingsController(IRatingService ratingService)
    {
        _ratingService = ratingService;
    }

    [HttpPost("media/{mediaId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<RatingDto>> RateMedia(Guid mediaId, [FromBody] JsonElement payload)
    {
        var valueResult = TryExtractValue(payload);
        if (!valueResult.IsValid) return BadRequest("Rating value is required.");
        return await HandleRate(async userId => await _ratingService.RateMediaAsync(userId, mediaId, valueResult.Value));
    }

    [HttpPost("seasons/{seasonId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<RatingDto>> RateSeason(Guid seasonId, [FromBody] JsonElement payload)
    {
        var valueResult = TryExtractValue(payload);
        if (!valueResult.IsValid) return BadRequest("Rating value is required.");
        return await HandleRate(async userId => await _ratingService.RateSeasonAsync(userId, seasonId, valueResult.Value));
    }

    [HttpPost("episodes/{episodeId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<RatingDto>> RateEpisode(Guid episodeId, [FromBody] JsonElement payload)
    {
        var valueResult = TryExtractValue(payload);
        if (!valueResult.IsValid) return BadRequest("Rating value is required.");
        return await HandleRate(async userId => await _ratingService.RateEpisodeAsync(userId, episodeId, valueResult.Value));
    }

    [HttpDelete("media/{mediaId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> DeleteMediaRating(Guid mediaId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteMediaRatingAsync(userId, mediaId));
    }

    [HttpDelete("seasons/{seasonId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> DeleteSeasonRating(Guid seasonId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteSeasonRatingAsync(userId, seasonId));
    }

    [HttpDelete("episodes/{episodeId:guid}/ratings")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> DeleteEpisodeRating(Guid episodeId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteEpisodeRatingAsync(userId, episodeId));
    }

    [HttpGet("media/{mediaId:guid}/ratings/summary")]
    public async Task<ActionResult<MediaRatingSummaryDto>> GetMediaSummary(Guid mediaId)
    {
        var result = await _ratingService.GetMediaRatingSummaryAsync(mediaId, GetOptionalUserId());
        return Ok(result);
    }

    [HttpGet("seasons/{seasonId:guid}/ratings/summary")]
    public async Task<ActionResult<TargetRatingSummaryDto>> GetSeasonSummary(Guid seasonId)
    {
        try
        {
            var result = await _ratingService.GetSeasonRatingSummaryAsync(seasonId, GetOptionalUserId());
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("episodes/{episodeId:guid}/ratings/summary")]
    public async Task<ActionResult<TargetRatingSummaryDto>> GetEpisodeSummary(Guid episodeId)
    {
        try
        {
            var result = await _ratingService.GetEpisodeRatingSummaryAsync(episodeId, GetOptionalUserId());
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private async Task<ActionResult<RatingDto>> HandleRate(Func<Guid, Task<RatingDto>> action)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue)
            return Unauthorized();

        try
        {
            var result = await action(userId.Value);
            return Ok(result);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    private async Task<IActionResult> HandleDelete(Func<Guid, Task> action)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue)
            return Unauthorized();

        await action(userId.Value);
        return NoContent();
    }

    private Guid? GetRequiredUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(userId) ? null : Guid.Parse(userId);
    }

    private Guid? GetOptionalUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(userId) ? null : Guid.Parse(userId);
    }

    private static (bool IsValid, int Value) TryExtractValue(JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Number && payload.TryGetInt32(out var numberValue))
            return (true, numberValue);

        if (payload.ValueKind == JsonValueKind.Object &&
            payload.TryGetProperty("value", out var valueProperty) &&
            valueProperty.ValueKind == JsonValueKind.Number &&
            valueProperty.TryGetInt32(out var objectValue))
            return (true, objectValue);

        return (false, default);
    }
}
