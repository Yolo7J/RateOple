using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;

namespace RateOple.Controllers;

[ApiController]
[Route("api/moderation")]
public class ModerationController : ControllerBase
{
    private readonly IModerationService _moderationService;
    private readonly IModerationAuditService _auditService;

    public ModerationController(IModerationService moderationService, IModerationAuditService auditService)
    {
        _moderationService = moderationService;
        _auditService = auditService;
    }

    [HttpPost("reports")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ReportDto>> CreateReport([FromBody] CreateReportDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var report = await _moderationService.CreateReportAsync(userId.Value, dto);
            return Ok(report);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("reports")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<PagedReportsDto>> GetReports([FromQuery] ReportQueryDto query)
    {
        var reports = await _moderationService.GetReportsAsync(query);
        return Ok(reports);
    }

    [HttpPut("reports/{id:guid}/status")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ReportDto>> UpdateStatus(Guid id, [FromBody] UpdateReportStatusDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var report = await _moderationService.UpdateReportStatusAsync(userId.Value, id, dto);
            return Ok(report);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("assignments")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ModeratorAssignmentDto>> CreateAssignment([FromBody] CreateModeratorAssignmentDto dto)
    {
        var userId = GetRequiredUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var assignment = await _moderationService.AssignModeratorAsync(userId.Value, dto);
            return Ok(assignment);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("assignments")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    public async Task<ActionResult<IReadOnlyList<ModeratorAssignmentDto>>> GetAssignments(
        [FromQuery] ModeratorScopeType? scopeType,
        [FromQuery] Guid? scopeId)
    {
        var assignments = await _moderationService.GetAssignmentsAsync(scopeType, scopeId);
        return Ok(assignments);
    }

    [HttpDelete("assignments")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> RemoveAssignment(
        [FromQuery] Guid userId,
        [FromQuery] ModeratorScopeType scopeType,
        [FromQuery] Guid? scopeId)
    {
        var actorId = GetRequiredUserId();
        if (!actorId.HasValue) return Unauthorized();

        await _moderationService.RemoveAssignmentAsync(actorId.Value, userId, scopeType, scopeId);
        return NoContent();
    }

    [HttpGet("audit-logs")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<PagedModerationAuditLogsDto>> GetAuditLogs([FromQuery] ModerationAuditLogQueryDto query)
    {
        var logs = await _auditService.GetLogsAsync(query);
        return Ok(logs);
    }

    private Guid? GetRequiredUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(claim) ? null : Guid.Parse(claim);
    }
}
