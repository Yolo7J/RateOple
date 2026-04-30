using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestModeration
{
    private readonly ApplicationDbContext _context;

    public TestModeration(ApplicationDbContext context)
    {
        _context = context;
    }

    public Report Report(User reporter, ReportTargetType targetType, Guid targetId, ReportStatus status = ReportStatus.Pending)
    {
        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = reporter.Id,
            TargetType = targetType,
            TargetId = targetId,
            Reason = "Test report",
            Status = status,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reports.Add(report);
        return report;
    }

    public ModeratorAssignment Assignment(User user, User assignedBy, ModeratorScopeType scopeType, Guid? scopeId = null)
    {
        var assignment = new ModeratorAssignment
        {
            UserId = user.Id,
            AssignedById = assignedBy.Id,
            ScopeType = scopeType,
            ScopeId = scopeType == ModeratorScopeType.Global ? Guid.Empty : scopeId,
            AssignedAt = DateTime.UtcNow
        };

        _context.ModeratorAssignments.Add(assignment);
        return assignment;
    }

    public ModerationAuditLog AuditLog(
        User actor,
        ModerationAuditAction action,
        Guid targetId,
        ModeratorScopeType? scopeType = null,
        Guid? scopeId = null)
    {
        var log = new ModerationAuditLog
        {
            Id = Guid.NewGuid(),
            PerformedById = actor.Id,
            Action = action,
            TargetId = targetId,
            ScopeType = scopeType,
            ScopeId = scopeId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ModerationAuditLogs.Add(log);
        return log;
    }
}
