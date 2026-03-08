using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Controllers;

[ApiController]
[Route("api")]
public class DiscoveryController : ControllerBase
{
    private readonly IDiscoveryService _discoveryService;

    public DiscoveryController(IDiscoveryService discoveryService)
    {
        _discoveryService = discoveryService;
    }

    [HttpGet("discovery/trending")]
    public async Task<ActionResult<IReadOnlyList<MediaListItemDto>>> GetTrending([FromQuery] int limit = 20)
    {
        var result = await _discoveryService.GetTrendingAsync(limit);
        return Ok(result);
    }

    [HttpGet("discovery/popular")]
    public async Task<ActionResult<IReadOnlyList<MediaListItemDto>>> GetPopular([FromQuery] int limit = 20)
    {
        var result = await _discoveryService.GetPopularAsync(limit);
        return Ok(result);
    }

    [HttpGet("discovery/recommended")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<MediaListItemDto>>> GetRecommended([FromQuery] int limit = 20)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdClaim))
            return Unauthorized();

        var result = await _discoveryService.GetRecommendedAsync(Guid.Parse(userIdClaim), limit);
        return Ok(result);
    }

    [HttpGet("media/{id:guid}/similar")]
    public async Task<ActionResult<IReadOnlyList<MediaListItemDto>>> GetSimilar(Guid id, [FromQuery] int limit = 20)
    {
        var result = await _discoveryService.GetSimilarAsync(id, limit);
        return Ok(result);
    }
}
