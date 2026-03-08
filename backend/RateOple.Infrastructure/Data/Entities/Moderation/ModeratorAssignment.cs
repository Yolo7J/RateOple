using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class ModeratorAssignment
{
    public Guid UserId { get; set; }
    public ModeratorScopeType ScopeType { get; set; } = ModeratorScopeType.Global;
    public Guid? ScopeId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public Guid AssignedById { get; set; }

    public User User { get; set; } = null!;
    public User AssignedBy { get; set; } = null!;
}
