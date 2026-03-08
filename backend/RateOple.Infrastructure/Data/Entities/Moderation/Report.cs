using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class Report
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public string Reason { get; set; } = null!;
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? ReviewedById { get; set; }

    public User Reporter { get; set; } = null!;
    public User? ReviewedBy { get; set; }
}
