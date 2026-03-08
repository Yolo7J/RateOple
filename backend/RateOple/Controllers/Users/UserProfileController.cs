using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api/users/me")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;
    private readonly IUserMediaStatusService _userMediaStatusService;

    public UserProfileController(
        IUserProfileService userProfileService,
        IUserMediaStatusService userMediaStatusService)
    {
        _userProfileService = userProfileService;
        _userMediaStatusService = userMediaStatusService;
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
    [IgnoreAntiforgeryToken]
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

    [HttpPost("change-password")]
    [IgnoreAntiforgeryToken]
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
    [IgnoreAntiforgeryToken]
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
