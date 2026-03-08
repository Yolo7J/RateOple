namespace RateOple.Core.Contracts.DTOs;

public class RatingDto
{
    public Guid Id { get; set; }
    public int Value { get; set; }
    public Guid UserId { get; set; }
    public Guid? MediaId { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid? EpisodeId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
