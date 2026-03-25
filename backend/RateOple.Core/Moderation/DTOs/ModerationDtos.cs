using RateOple.Constants.Enums;

namespace RateOple.Core.Moderation.DTOs;

public class CreateReportDto
{
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class UpdateReportStatusDto
{
    public ReportStatus Status { get; set; }
}

public class ReportQueryDto
{
    public ReportStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 30;
}

public class ReportDto
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ReportStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? ReviewedById { get; set; }
}

public class PagedReportsDto
{
    public List<ReportDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class CreateModeratorAssignmentDto
{
    public Guid UserId { get; set; }
    public ModeratorScopeType ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
}

public class ModeratorAssignmentDto
{
    public Guid UserId { get; set; }
    public ModeratorScopeType ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid AssignedById { get; set; }
}

public class ModerationAuditLogQueryDto
{
    public ModerationAuditAction? Action { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 30;
}

public class ModerationAuditLogDto
{
    public Guid Id { get; set; }
    public ModerationAuditAction Action { get; set; }
    public Guid PerformedById { get; set; }
    public Guid TargetId { get; set; }
    public ModeratorScopeType? ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PagedModerationAuditLogsDto
{
    public List<ModerationAuditLogDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
