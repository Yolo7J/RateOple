using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Extensions;
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
        var profile = await _userProfileService.GetProfileAsync(User.GetRequiredUserId());
        return Ok(profile);
    }

    [HttpPut("profile")]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var profile = await _userProfileService.UpdateProfileAsync(User.GetRequiredUserId(), dto);
        return Ok(profile);
    }

    [HttpGet("status")]
    public async Task<ActionResult<IReadOnlyList<UserMediaStatusDto>>> GetMyStatuses([FromQuery] MediaStatusQueryDto query)
    {
        var items = await _userMediaStatusService.GetUserStatusesAsync(User.GetRequiredUserId(), query);
        return Ok(items);
    }

    [HttpGet("ratings")]
    public async Task<IActionResult> GetMyRatings()
    {
        var ratings = await _ratingService.GetUserRatingsAsync(User.GetRequiredUserId());
        return Ok(ratings);
    }

    [HttpGet("reviews")]
    public async Task<IActionResult> GetMyReviews()
    {
        var reviews = await _reviewService.GetUserReviewsAsync(User.GetRequiredUserId());
        return Ok(reviews);
    }

    [HttpGet("favorite-genres")]
    public async Task<ActionResult<IReadOnlyList<UserFavoriteGenreDto>>> GetMyFavoriteGenres()
    {
        var userId = User.GetRequiredUserId();

        var genres = await _context.UserGenreScores
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.Score > 0)
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
        try
        {
            await _userProfileService.ChangePasswordAsync(User.GetRequiredUserId(), dto.CurrentPassword, dto.NewPassword);
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
        try
        {
            await _userProfileService.DeleteAccountAsync(User.GetRequiredUserId(), dto.CurrentPassword);
            Response.Cookies.Delete("accessToken");
            Response.Cookies.Delete("refreshToken");
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

}
