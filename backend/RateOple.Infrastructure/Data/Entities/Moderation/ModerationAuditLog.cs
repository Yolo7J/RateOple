using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class ModerationAuditLog
{
    public Guid Id { get; set; }
    public ModerationAuditAction Action { get; set; }
    public Guid PerformedById { get; set; }
    public Guid TargetId { get; set; }
    public ModeratorScopeType? ScopeType { get; set; }
    public Guid? ScopeId { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User PerformedBy { get; set; } = null!;
}
