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

    public MediaController(IMediaService mediaService)
    {
        _mediaService = mediaService;
    }

    // GET /api/media?types=Movie,Book&genreIds=1,3&search=batman&sortBy=rating&page=1
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
}