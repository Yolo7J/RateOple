using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;
using RateOple.Core.Media.DTOs;
using RateOple.Core.Users.DTOs;
using RateOple.Extensions;

namespace RateOple.Controllers;

[ApiController]
[Route("api/media")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;
    private readonly ITvSeriesService _tvSeriesService;
    private readonly ITmdbService _tmdb;
    private readonly IInteractionService _interactionService;
    private readonly IUserMediaStatusService _userMediaStatusService;

    public MediaController(
        IMediaService mediaService,
        ITvSeriesService tvSeriesService,
        ITmdbService tmdb,
        IInteractionService interactionService,
        IUserMediaStatusService userMediaStatusService)
    {
        _mediaService     = mediaService;
        _tvSeriesService  = tvSeriesService;
        _tmdb             = tmdb;
        _interactionService = interactionService;
        _userMediaStatusService = userMediaStatusService;
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

        var userId = User.GetUserIdOrNull();
        if (result != null && userId.HasValue)
        {
            await _interactionService.TrackMediaOpenedAsync(userId.Value, id);
        }

        return result == null ? NotFound() : Ok(result);
    }

    // GET /api/media/genres
    [HttpGet("genres")]
    public async Task<IActionResult> GetGenres()
    {
        var genres = await _mediaService.GetGenresAsync();
        return Ok(genres);
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _mediaService.GetTagsAsync();
        return Ok(tags);
    }

    // ── TMDB proxies ──────────────────────────────────────────────────────────

    // GET /api/media/tmdb/search?q=batman&type=movie
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

    // GET /api/media/tmdb/series/{tmdbId}
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
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> CreateMovie([FromBody] CreateMovieDto dto)
    {
        var result = await _mediaService.CreateMovieAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // POST /api/media/books
    [HttpPost("books")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> CreateBook([FromBody] CreateBookDto dto)
    {
        var result = await _mediaService.CreateBookAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // POST /api/media/tvseries
    [HttpPost("tvseries")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> CreateTvSeries([FromBody] CreateTvSeriesDto dto)
    {
        var result = await _mediaService.CreateTvSeriesAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // ── Bulk create ───────────────────────────────────────────────────────────

    // POST /api/media/bulk
    [HttpPost("bulk")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateDto dto)
    {
        var result = await _mediaService.BulkCreateAsync(dto);
        var status = result.Errors.Count == 0 ? 200
                   : result.Created.Count == 0 ? 400
                   : 207;
        return StatusCode(status, result);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    // PUT /api/media/{id}/movie
    [HttpPut("{id:guid}/movie")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateMovie(Guid id, [FromBody] UpdateMovieDto dto)
    {
        var result = await _mediaService.UpdateMovieAsync(id, dto);
        await TrackMediaStatusChangedAsync(id);
        return Ok(result);
    }

    // PUT /api/media/{id}/book
    [HttpPut("{id:guid}/book")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateBook(Guid id, [FromBody] UpdateBookDto dto)
    {
        var result = await _mediaService.UpdateBookAsync(id, dto);
        await TrackMediaStatusChangedAsync(id);
        return Ok(result);
    }

    // PUT /api/media/{id}/tvseries
    [HttpPut("{id:guid}/tvseries")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateTvSeries(Guid id, [FromBody] UpdateTvSeriesDto dto)
    {
        var result = await _mediaService.UpdateTvSeriesAsync(id, dto);
        await TrackMediaStatusChangedAsync(id);
        return Ok(result);
    }

    [HttpPost("{id:guid}/tags")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> AddTags(Guid id, [FromBody] UpsertMediaTagsDto dto)
    {
        var result = await _mediaService.AddTagsAsync(id, dto);
        return Ok(result);
    }

    [HttpDelete("{id:guid}/tags/{tagId:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> RemoveTag(Guid id, int tagId)
    {
        var result = await _mediaService.RemoveTagAsync(id, tagId);
        return Ok(result);
    }

    // ── Soft delete ───────────────────────────────────────────────────────────

    // DELETE /api/media/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> SoftDelete(Guid id)
    {
        await _mediaService.SoftDeleteAsync(id);
        return NoContent();
    }

    // ── User status tracking ──────────────────────────────────────────────────

    // POST /api/media/{id}/status
    [HttpPost("{id:guid}/status")]
    [Authorize]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetUserMediaStatusDto dto)
    {
        var userId = User.GetRequiredUserId();
        var result = await _userMediaStatusService.SetStatusAsync(userId, id, dto);
        await _interactionService.TrackMediaStatusChangedAsync(userId, id);
        return Ok(result);
    }

    // ── Seasons (nested under media for intuitive routing) ────────────────────

    // GET /api/media/{id}/seasons
    [HttpGet("{id:guid}/seasons")]
    public async Task<IActionResult> GetSeasons(Guid id)
    {
        var result = await _tvSeriesService.GetSeasonsAsync(id);
        return Ok(result);
    }

    // POST /api/media/{id}/seasons
    [HttpPost("{id:guid}/seasons")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> AddSeason(Guid id, [FromBody] UpsertSeasonDto dto)
    {
        var result = await _tvSeriesService.AddSeasonAsync(id, dto);
        return CreatedAtAction(nameof(GetSeasons), new { id }, result);
    }

    // PUT /api/media/{id}/seasons/{seasonNumber}
    [HttpPut("{id:guid}/seasons/{seasonNumber:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateSeason(Guid id, int seasonNumber, [FromBody] UpsertSeasonDto dto)
    {
        var result = await _tvSeriesService.UpdateSeasonAsync(id, seasonNumber, dto);
        return Ok(result);
    }

    // DELETE /api/media/{id}/seasons/{seasonNumber}
    [HttpDelete("{id:guid}/seasons/{seasonNumber:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> DeleteSeason(Guid id, int seasonNumber)
    {
        await _tvSeriesService.DeleteSeasonAsync(id, seasonNumber);
        return NoContent();
    }

    // ── Episodes (nested under seasons) ──────────────────────────────────────

    // POST /api/media/{id}/seasons/{seasonNumber}/episodes
    [HttpPost("{id:guid}/seasons/{seasonNumber:int}/episodes")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> AddEpisode(Guid id, int seasonNumber, [FromBody] UpsertEpisodeDto dto)
    {
        var result = await _tvSeriesService.AddEpisodeAsync(id, seasonNumber, dto);
        return CreatedAtAction(nameof(GetSeasons), new { id }, result);
    }

    // PUT /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}
    [HttpPut("{id:guid}/seasons/{seasonNumber:int}/episodes/{episodeNumber:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> UpdateEpisode(
        Guid id, int seasonNumber, int episodeNumber, [FromBody] UpsertEpisodeDto dto)
    {
        var result = await _tvSeriesService.UpdateEpisodeAsync(id, seasonNumber, episodeNumber, dto);
        return Ok(result);
    }

    // DELETE /api/media/{id}/seasons/{seasonNumber}/episodes/{episodeNumber}
    [HttpDelete("{id:guid}/seasons/{seasonNumber:int}/episodes/{episodeNumber:int}")]
    [Authorize(Policy = "RequireAdmin")]
    public async Task<IActionResult> DeleteEpisode(Guid id, int seasonNumber, int episodeNumber)
    {
        await _tvSeriesService.DeleteEpisodeAsync(id, seasonNumber, episodeNumber);
        return NoContent();
    }

    private async Task TrackMediaStatusChangedAsync(Guid mediaId)
    {
        var userId = User.GetUserIdOrNull();
        if (!userId.HasValue)
            return;

        await _interactionService.TrackMediaStatusChangedAsync(userId.Value, mediaId);
    }
}
