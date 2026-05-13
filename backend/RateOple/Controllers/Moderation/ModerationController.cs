using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Extensions;

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
    public async Task<ActionResult<ReportDto>> CreateReport([FromBody] CreateReportDto dto)
    {
        var report = await _moderationService.CreateReportAsync(User.GetRequiredUserId(), dto);
        return Ok(report);
    }

    [HttpGet("reports")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<PagedReportsDto>> GetReports([FromQuery] ReportQueryDto query)
    {
        var reports = await _moderationService.GetReportsAsync(
            User.GetRequiredUserId(),
            User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin),
            query);
        return Ok(reports);
    }

    [HttpPut("reports/{id:guid}/status")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<ReportDto>> UpdateStatus(Guid id, [FromBody] UpdateReportStatusDto dto)
    {
        var report = await _moderationService.UpdateReportStatusAsync(
            User.GetRequiredUserId(),
            User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin),
            id,
            dto);
        return Ok(report);
    }

    [HttpDelete("reports/{id:guid}/target")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<ReportDto>> RemoveTarget(Guid id, [FromBody] RemoveReportTargetDto dto)
    {
        var report = await _moderationService.RemoveReportTargetAsync(
            User.GetRequiredUserId(),
            User.IsInRole(RoleConstants.Admin) || User.IsInRole(RoleConstants.SuperAdmin),
            id,
            dto);
        return Ok(report);
    }

    [HttpPost("assignments")]
    [Authorize(Policy = PolicyConstants.RequireAdmin)]
    public async Task<ActionResult<ModeratorAssignmentDto>> CreateAssignment([FromBody] CreateModeratorAssignmentDto dto)
    {
        var assignment = await _moderationService.AssignModeratorAsync(User.GetRequiredUserId(), dto);
        return Ok(assignment);
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
    public async Task<IActionResult> RemoveAssignment(
        [FromQuery] Guid userId,
        [FromQuery] ModeratorScopeType scopeType,
        [FromQuery] Guid? scopeId)
    {
        await _moderationService.RemoveAssignmentAsync(User.GetRequiredUserId(), userId, scopeType, scopeId);
        return NoContent();
    }

    [HttpGet("audit-logs")]
    [Authorize(Policy = PolicyConstants.CanModerateContent)]
    public async Task<ActionResult<PagedModerationAuditLogsDto>> GetAuditLogs([FromQuery] ModerationAuditLogQueryDto query)
    {
        var logs = await _auditService.GetLogsAsync(query);
        return Ok(logs);
    }

}
