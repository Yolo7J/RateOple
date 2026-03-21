namespace RateOple.Infrastructure.Data.Entities;

public class GroupPostVote
{
    public Guid GroupPostId { get; set; }
    public Guid UserId { get; set; }
    public int Value { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public GroupPost Post { get; set; } = null!;
    public User User { get; set; } = null!;
}
