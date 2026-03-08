namespace RateOple.Core.Social.DTOs;

public class MediaRatingSummaryDto
{
    public Guid MediaId { get; set; }
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
    public int? UserRating { get; set; } // The rating of the requesting user, if any
}
