using Microsoft.AspNetCore.Mvc;
using RateOple.Core.Contracts;

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

    [HttpGet]
    // public async Task<IActionResult> GetAll()
    //    => Ok(await _mediaService.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var media = await _mediaService.GetByIdAsync(id);
        return media is null ? NotFound() : Ok(media);
    }
}
