using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class UserMediaStatus
{
    public Guid UserId { get; set; }
    public Guid MediaId { get; set; }
    public MediaProgressStatus Status { get; set; } = MediaProgressStatus.Plan;
    public int? ProgressPages { get; set; }
    public int? ProgressSeason { get; set; }
    public int? ProgressEpisode { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Media Media { get; set; } = null!;
}
