namespace RateOple.Infrastructure.Data.Entities;

public class FollowCollection
{
    public Guid UserId { get; set; }
    public Guid CollectionId { get; set; }
    public DateTime FollowedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Collection Collection { get; set; } = null!;
}
