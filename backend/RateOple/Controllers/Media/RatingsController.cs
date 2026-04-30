using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Social.DTOs;
using RateOple.Extensions;

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
    public async Task<ActionResult<RatingDto>> RateMedia(Guid mediaId, [FromBody] RatingUpsertDto dto)
    {
        return await HandleRate(async userId => await _ratingService.RateMediaAsync(userId, mediaId, dto.Value));
    }

    [HttpPost("seasons/{seasonId:guid}/ratings")]
    [Authorize]
    public async Task<ActionResult<RatingDto>> RateSeason(Guid seasonId, [FromBody] RatingUpsertDto dto)
    {
        return await HandleRate(async userId => await _ratingService.RateSeasonAsync(userId, seasonId, dto.Value));
    }

    [HttpPost("episodes/{episodeId:guid}/ratings")]
    [Authorize]
    public async Task<ActionResult<RatingDto>> RateEpisode(Guid episodeId, [FromBody] RatingUpsertDto dto)
    {
        return await HandleRate(async userId => await _ratingService.RateEpisodeAsync(userId, episodeId, dto.Value));
    }

    [HttpDelete("media/{mediaId:guid}/ratings")]
    [Authorize]
    public async Task<IActionResult> DeleteMediaRating(Guid mediaId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteMediaRatingAsync(userId, mediaId));
    }

    [HttpDelete("seasons/{seasonId:guid}/ratings")]
    [Authorize]
    public async Task<IActionResult> DeleteSeasonRating(Guid seasonId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteSeasonRatingAsync(userId, seasonId));
    }

    [HttpDelete("episodes/{episodeId:guid}/ratings")]
    [Authorize]
    public async Task<IActionResult> DeleteEpisodeRating(Guid episodeId)
    {
        return await HandleDelete(async userId => await _ratingService.DeleteEpisodeRatingAsync(userId, episodeId));
    }

    [HttpGet("media/{mediaId:guid}/ratings/summary")]
    public async Task<ActionResult<MediaRatingSummaryDto>> GetMediaSummary(Guid mediaId)
    {
        var result = await _ratingService.GetMediaRatingSummaryAsync(mediaId, User.GetUserIdOrNull());
        return Ok(result);
    }

    [HttpGet("seasons/{seasonId:guid}/ratings/summary")]
    public async Task<ActionResult<TargetRatingSummaryDto>> GetSeasonSummary(Guid seasonId)
    {
        var result = await _ratingService.GetSeasonRatingSummaryAsync(seasonId, User.GetUserIdOrNull());
        return Ok(result);
    }

    [HttpGet("episodes/{episodeId:guid}/ratings/summary")]
    public async Task<ActionResult<TargetRatingSummaryDto>> GetEpisodeSummary(Guid episodeId)
    {
        var result = await _ratingService.GetEpisodeRatingSummaryAsync(episodeId, User.GetUserIdOrNull());
        return Ok(result);
    }

    private async Task<ActionResult<RatingDto>> HandleRate(Func<Guid, Task<RatingDto>> action)
    {
        var result = await action(User.GetRequiredUserId());
        return Ok(result);
    }

    private async Task<IActionResult> HandleDelete(Func<Guid, Task> action)
    {
        await action(User.GetRequiredUserId());
        return NoContent();
    }
}
