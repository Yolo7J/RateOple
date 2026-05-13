using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Extensions;

namespace RateOple.Controllers;

[ApiController]
[Route("api/suspension-appeals")]
public class SuspensionAppealsController : ControllerBase
{
    private readonly ISuspensionAppealService _appeals;

    public SuspensionAppealsController(ISuspensionAppealService appeals)
    {
        _appeals = appeals;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<SuspensionAppealDto>> Create([FromBody] CreateSuspensionAppealDto dto)
    {
        var appeal = await _appeals.CreateAsync(User.GetRequiredUserId(), dto);
        return Ok(appeal);
    }

    [HttpPost("{appealId:guid}/resolve")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    public async Task<ActionResult<SuspensionAppealDto>> Resolve(Guid appealId, [FromBody] ResolveSuspensionAppealDto dto)
    {
        var appeal = await _appeals.ResolveAsync(User.GetRequiredUserId(), appealId, dto);
        return Ok(appeal);
    }
}
