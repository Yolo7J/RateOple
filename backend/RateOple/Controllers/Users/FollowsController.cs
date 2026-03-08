using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Services;
using System.Security.Claims;

namespace RateOple.Controllers
{
    [ApiController]
    [Route("api/follows")]
    [Authorize]
    public class FollowsController : ControllerBase
    {
        private readonly IFollowService _followService;

        public FollowsController(IFollowService followService)
        {
            _followService = followService;
        }

        private Guid CurrentUserId =>
            Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("{userId}")]
        public async Task<IActionResult> Follow(Guid userId)
        {
            await _followService.FollowAsync(CurrentUserId, userId);
            return Ok();
        }

        [HttpDelete("{userId}")]
        public async Task<IActionResult> Unfollow(Guid userId)
        {
            await _followService.UnfollowAsync(CurrentUserId, userId);
            return NoContent();
        }

        [HttpGet("{userId}/status")]
        public async Task<IActionResult> IsFollowing(Guid userId)
        {
            var isFollowing = await _followService
                .IsFollowingAsync(CurrentUserId, userId);

            return Ok(isFollowing);
        }
    }
}
