namespace RateOple.Infrastructure.Data.Entities;

public class GroupBan
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public Guid UserId { get; set; }
    public Guid BannedById { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? RevokedById { get; set; }
    public DateTime? RevokedAt { get; set; }

    public Group Group { get; set; } = null!;
    public User User { get; set; } = null!;
    public User BannedBy { get; set; } = null!;
    public User? RevokedBy { get; set; }
}
