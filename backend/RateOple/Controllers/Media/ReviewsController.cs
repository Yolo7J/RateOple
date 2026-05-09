using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Social.DTOs;
using RateOple.Extensions;

namespace RateOple.Controllers;

[ApiController]
[Route("api")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpPost("reviews")]
    [Authorize]
    public async Task<ActionResult<ReviewDto>> CreateReview([FromBody] CreateReviewDto dto)
    {
        return await HandleReviewAction(async userId => await _reviewService.CreateReviewAsync(userId, dto));
    }

    [HttpPut("reviews/{reviewId:guid}")]
    [Authorize]
    public async Task<ActionResult<ReviewDto>> UpdateReview(Guid reviewId, [FromBody] UpdateReviewDto dto)
    {
        return await HandleReviewAction(async userId => await _reviewService.UpdateReviewAsync(userId, reviewId, dto));
    }

    [HttpDelete("reviews/{reviewId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(Guid reviewId, [FromQuery] bool deleteRating = false)
    {
        await _reviewService.DeleteReviewAsync(User.GetRequiredUserId(), reviewId, deleteRating);
        return NoContent();
    }

    [HttpGet("media/{mediaId:guid}/reviews")]
    public async Task<ActionResult<IReadOnlyList<ReviewDto>>> GetMediaReviews(Guid mediaId, [FromQuery] string target = "all")
    {
        if (!TryParseTargetFilter(target, out var filter))
        {
            ModelState.AddModelError(nameof(target), "Target must be either 'all' or 'media'.");
            return ValidationProblem(ModelState);
        }

        var reviews = await _reviewService.GetMediaReviewsAsync(mediaId, filter);
        return Ok(reviews);
    }

    [HttpGet("seasons/{seasonId:guid}/reviews")]
    public async Task<ActionResult<IReadOnlyList<ReviewDto>>> GetSeasonReviews(Guid seasonId)
    {
        var reviews = await _reviewService.GetSeasonReviewsAsync(seasonId);
        return Ok(reviews);
    }

    [HttpGet("episodes/{episodeId:guid}/reviews")]
    public async Task<ActionResult<IReadOnlyList<ReviewDto>>> GetEpisodeReviews(Guid episodeId)
    {
        var reviews = await _reviewService.GetEpisodeReviewsAsync(episodeId);
        return Ok(reviews);
    }

    private async Task<ActionResult<ReviewDto>> HandleReviewAction(Func<Guid, Task<ReviewDto>> action)
    {
        var result = await action(User.GetRequiredUserId());
        return Ok(result);
    }

    private static bool TryParseTargetFilter(string? value, out ReviewTargetFilter filter)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            filter = ReviewTargetFilter.All;
            return true;
        }

        if (value.Equals("media", StringComparison.OrdinalIgnoreCase))
        {
            filter = ReviewTargetFilter.Media;
            return true;
        }

        filter = ReviewTargetFilter.All;
        return false;
    }
}
