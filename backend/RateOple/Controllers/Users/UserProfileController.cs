using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Infrastructure.Data;

namespace RateOple.Controllers;

[ApiController]
[Route("api/users/me")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;
    private readonly IUserMediaStatusService _userMediaStatusService;
    private readonly IRatingService _ratingService;
    private readonly IReviewService _reviewService;
    private readonly ApplicationDbContext _context;

    public UserProfileController(
        IUserProfileService userProfileService,
        IUserMediaStatusService userMediaStatusService,
        IRatingService ratingService,
        IReviewService reviewService,
        ApplicationDbContext context)
    {
        _userProfileService = userProfileService;
        _userMediaStatusService = userMediaStatusService;
        _ratingService = ratingService;
        _reviewService = reviewService;
        _context = context;
    }

    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var profile = await _userProfileService.GetProfileAsync(userId.Value);
        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var profile = await _userProfileService.UpdateProfileAsync(userId.Value, dto);
        return Ok(profile);
    }

    [HttpGet("status")]
    public async Task<ActionResult<IReadOnlyList<UserMediaStatusDto>>> GetMyStatuses([FromQuery] MediaStatusQueryDto query)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var items = await _userMediaStatusService.GetUserStatusesAsync(userId.Value, query);
        return Ok(items);
    }

    [HttpGet("ratings")]
    public async Task<IActionResult> GetMyRatings()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var ratings = await _ratingService.GetUserRatingsAsync(userId.Value);
        return Ok(ratings);
    }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetMyReviews()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var reviews = await _reviewService.GetUserReviewsAsync(userId.Value);
        return Ok(reviews);
    }

    [HttpGet("favorite-genres")]
    public async Task<ActionResult<IReadOnlyList<UserFavoriteGenreDto>>> GetMyFavoriteGenres()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var genres = await _context.UserGenreScores
            .AsNoTracking()
            .Where(x => x.UserId == userId.Value && x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(20)
            .Select(x => new UserFavoriteGenreDto
            {
                GenreId = x.GenreId,
                Name = x.Genre.Name,
                Score = x.Score
            })
            .ToListAsync();

        return Ok(genres);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _userProfileService.ChangePasswordAsync(userId.Value, dto.CurrentPassword, dto.NewPassword);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            await _userProfileService.DeleteAccountAsync(userId.Value, dto.CurrentPassword);
            Response.Cookies.Delete("accessToken");
            Response.Cookies.Delete("refreshToken");
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }
}
