using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;
using RateOple.Core.Validation;

namespace RateOple.Core.Moderation.DTOs;

public class CreateReportDto
{
    [EnumDataType(typeof(ReportTargetType))]
    public ReportTargetType TargetType { get; set; }
    [NotEmptyGuid]
    public Guid TargetId { get; set; }
    [Required]
    [MaxLength(2000)]
    public string Reason { get; set; } = string.Empty;
}

public class UpdateReportStatusDto
{
    [EnumDataType(typeof(ReportStatus))]
    public ReportStatus Status { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }
}

public class ReportQueryDto
{
    [EnumDataType(typeof(ReportStatus))]
    public ReportStatus? Status { get; set; }
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 30;
}

public class ReportDto
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public string? ReporterDisplayName { get; set; }
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public string? TargetDisplayName { get; set; }
    public Guid? TargetAuthorId { get; set; }
    public string? TargetAuthorDisplayName { get; set; }
    public ModeratorScopeType? ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public string? ScopeName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ReportStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? ReviewedById { get; set; }
    public string? ReviewedByDisplayName { get; set; }
    public ReportTargetActionAvailabilityDto TargetActions { get; set; } = new();
}

public class ReportTargetActionAvailabilityDto
{
    public bool CanRemoveTarget { get; set; }
    public string? RemoveUnavailableReason { get; set; }
}

public class RemoveReportTargetDto
{
    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class PagedReportsDto
{
    public List<ReportDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasActiveModerationAssignments { get; set; }
    public bool CanSeeAllReports { get; set; }
}

public class CreateModeratorAssignmentDto : IValidatableObject
{
    public Guid UserId { get; set; }
    [MaxLength(256)]
    public string? UserIdentifier { get; set; }
    [EnumDataType(typeof(ModeratorScopeType))]
    public ModeratorScopeType ScopeType { get; set; }
    [NotEmptyGuid]
    public Guid? ScopeId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (UserId == Guid.Empty && string.IsNullOrWhiteSpace(UserIdentifier))
            yield return new ValidationResult("UserId or UserIdentifier is required.", [nameof(UserId), nameof(UserIdentifier)]);

        if (ScopeType != ModeratorScopeType.Global && !ScopeId.HasValue)
            yield return new ValidationResult("ScopeId is required for non-global moderator assignments.", [nameof(ScopeId)]);
    }
}

public class ModeratorAssignmentDto
{
    public Guid UserId { get; set; }
    public string? UserDisplayName { get; set; }
    public ModeratorScopeType ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public string? ScopeName { get; set; }
    public DateTime AssignedAt { get; set; }
    public Guid AssignedById { get; set; }
    public string? AssignedByDisplayName { get; set; }
}

public class ModerationAuditLogQueryDto
{
    [EnumDataType(typeof(ModerationAuditAction))]
    public ModerationAuditAction? Action { get; set; }
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 30;
}

public class ModerationAuditLogDto
{
    public Guid Id { get; set; }
    public ModerationAuditAction Action { get; set; }
    public Guid PerformedById { get; set; }
    public string? PerformedByDisplayName { get; set; }
    public Guid TargetId { get; set; }
    public string? TargetDisplayName { get; set; }
    public ModeratorScopeType? ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public string? ScopeName { get; set; }
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
