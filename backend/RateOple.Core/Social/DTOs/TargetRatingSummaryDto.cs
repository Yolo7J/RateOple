namespace RateOple.Core.Social.DTOs;

public class TargetRatingSummaryDto
{
    public Guid? MediaId { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
    public int? UserRating { get; set; }
    public Guid? CurrentUserRatingId { get; set; }
}
