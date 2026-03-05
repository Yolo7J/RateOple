using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Media;

namespace RateOple.Controllers;

[ApiController]
[Route("api/media")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly ITmdbService _tmdb;

    public MediaController(IMediaService mediaService, ITmdbService tmdb)
    {
        _mediaService = mediaService;
        _tmdb = tmdb;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    // GET /api/media
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] MediaQueryDto query)
    {
        var result = await _mediaService.GetAllAsync(query);
        return Ok(result);
    }

    // GET /api/media/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediaService.GetByIdAsync(id);
        return result == null ? NotFound() : Ok(result);
    }

    // GET /api/media/genres
    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _mediaService.GetGenresAsync();
        return Ok(genres);
    }

    // ── TMDB proxies ──────────────────────────────────────────────────────────

    // GET /api/media/tmdb/search?q=batman&type=movie   (type = "movie" | "tv")
    [HttpGet("tmdb/search")]
    [Authorize]
    public async Task<IActionResult> TmdbSearch([FromQuery] string q, [FromQuery] string type = "movie")
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("Query is required.");
        var results = await _tmdb.SearchAsync(q, type);
        return Ok(results);
    }

    // GET /api/media/tmdb/details/{tmdbId}?type=movie
    [HttpGet("tmdb/details/{tmdbId:int}")]
    [Authorize]
    public async Task<IActionResult> TmdbDetails(int tmdbId, [FromQuery] string type = "movie")
    {
        var result = await _tmdb.GetDetailsAsync(tmdbId, type);
        return result == null ? NotFound() : Ok(result);
    }

    // GET /api/media/tmdb/series/{tmdbId}  — full series + all seasons + episodes
    [HttpGet("tmdb/series/{tmdbId:int}")]
    [Authorize]
    public async Task<IActionResult> TmdbSeriesDetails(int tmdbId)
    {
        var result = await _tmdb.GetSeriesDetailsAsync(tmdbId);
        return result == null ? NotFound() : Ok(result);
    }

    // ── Open Library proxies ──────────────────────────────────────────────────

    // GET /api/media/books/search?q=dune
    [HttpGet("books/search")]
    [Authorize]
    public async Task<IActionResult> OlSearch([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("Query is required.");
        var results = await _mediaService.SearchBooksAsync(q);
        return Ok(results);
    }

    // GET /api/media/books/details?olId=/works/OL45804W
    [HttpGet("books/details")]
    [Authorize]
    public async Task<IActionResult> OlDetails([FromQuery] string olId)
    {
        if (string.IsNullOrWhiteSpace(olId)) return BadRequest("olId is required.");
        var result = await _mediaService.GetBookDetailsAsync(olId);
        return result == null ? NotFound() : Ok(result);
    }

    // ── Single create ─────────────────────────────────────────────────────────

    // POST /api/media/movies
    [HttpPost("movies")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> CreateMovie([FromBody] CreateMovieDto dto)
    {
        var result = await _mediaService.CreateMovieAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // POST /api/media/books
    [HttpPost("books")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> CreateBook([FromBody] CreateBookDto dto)
    {
        var result = await _mediaService.CreateBookAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // POST /api/media/tvseries
    [HttpPost("tvseries")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> CreateTvSeries([FromBody] CreateTvSeriesDto dto)
    {
        var result = await _mediaService.CreateTvSeriesAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // ── Bulk create (cart) ────────────────────────────────────────────────────

    // POST /api/media/bulk
    [HttpPost("bulk")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateDto dto)
    {
        var result = await _mediaService.BulkCreateAsync(dto);

        // 207 Multi-Status: some may have succeeded, some failed
        var status = result.Errors.Count == 0 ? 200
                   : result.Created.Count == 0 ? 400
                   : 207;

        return StatusCode(status, result);
    }
}