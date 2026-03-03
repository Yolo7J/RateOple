using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;

namespace RateOple.Controllers;

[ApiController]
[Route("api/tmdb")]
[Authorize]                     // must be logged in to search — prevents anonymous abuse
[IgnoreAntiforgeryToken]
public class TmdbController : ControllerBase
{
    private readonly ITmdbService _tmdb;

    public TmdbController(ITmdbService tmdb)
    {
        _tmdb = tmdb;
    }

    // GET /api/tmdb/search?query=inception&type=movie
    // type: "movie" | "tv"
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string query, [FromQuery] string type = "movie")
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest("query is required");

        if (type != "movie" && type != "tv")
            return BadRequest("type must be 'movie' or 'tv'");

        var results = await _tmdb.SearchAsync(query, type);
        return Ok(results);
    }

    // GET /api/tmdb/details?tmdbId=27205&type=movie
    [HttpGet("details")]
    public async Task<IActionResult> Details([FromQuery] int tmdbId, [FromQuery] string type = "movie")
    {
        if (type != "movie" && type != "tv")
            return BadRequest("type must be 'movie' or 'tv'");

        var result = await _tmdb.GetDetailsAsync(tmdbId, type);
        return result == null ? NotFound() : Ok(result);
    }
}