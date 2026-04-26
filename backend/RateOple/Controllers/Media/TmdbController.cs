using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;

namespace RateOple.Controllers;

[ApiController]
[Route("api/tmdb")]
[Authorize]                     // must be logged in to search — prevents anonymous abuse
public class TmdbController : ControllerBase
{
    private readonly ITmdbService _tmdb;
    private readonly ITmdbImportService _import;

    public TmdbController(ITmdbService tmdb, ITmdbImportService import)
    {
        _tmdb = tmdb;
        _import = import;
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

    // POST /api/tmdb/import-series/{tmdbId}
    [HttpPost("import-series/{tmdbId:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> ImportSeries(int tmdbId)
    {
        var id = await _import.ImportSeriesAsync(tmdbId);
        return Ok(new { mediaId = id });
    }
}
