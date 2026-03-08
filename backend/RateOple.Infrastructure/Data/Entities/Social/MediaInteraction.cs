using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class MediaInteraction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? MediaId { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public InteractionType InteractionType { get; set; }
    public int Points { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Media? Media { get; set; }
    public Season? Season { get; set; }
    public Episode? Episode { get; set; }
}
