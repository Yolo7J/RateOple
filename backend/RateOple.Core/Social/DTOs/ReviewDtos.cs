using System.ComponentModel.DataAnnotations;
using RateOple.Core.Validation;

namespace RateOple.Core.Social.DTOs;

public class CreateReviewDto
{
    [NotEmptyGuid]
    public Guid RatingId { get; set; }
    [Required]
    [MaxLength(8000)]
    public string Content { get; set; } = string.Empty;
    [Range(1, 10)]
    public int? UpdatedRatingValue { get; set; }
}

public class UpdateReviewDto
{
    [Required]
    [MaxLength(8000)]
    public string Content { get; set; } = string.Empty;
    [Range(1, 10)]
    public int? UpdatedRatingValue { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserDisplayName { get; set; }
    public Guid MediaId { get; set; }
    public Guid RatingId { get; set; }
    public string TargetType { get; set; } = string.Empty;
    public int RatingValue { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public int? SeasonNumber { get; set; }
    public int? EpisodeNumber { get; set; }
    public string TargetTitle { get; set; } = string.Empty;
    public string? MediaTitle { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public enum ReviewTargetFilter
{
    All,
    Media
}
