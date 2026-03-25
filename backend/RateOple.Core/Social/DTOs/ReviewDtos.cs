namespace RateOple.Core.Social.DTOs;

public class CreateReviewDto
{
    public Guid RatingId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int? UpdatedRatingValue { get; set; }
}

public class UpdateReviewDto
{
    public string Content { get; set; } = string.Empty;
    public int? UpdatedRatingValue { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserDisplayName { get; set; }
    public Guid MediaId { get; set; }
    public Guid RatingId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
