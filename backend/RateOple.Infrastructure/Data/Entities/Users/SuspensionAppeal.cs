using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class SuspensionAppeal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public SuspensionAppealStatus Status { get; set; } = SuspensionAppealStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedByUserId { get; set; }
    public string? ResolutionNote { get; set; }

    public User User { get; set; } = null!;
    public User? ResolvedByUser { get; set; }
}
