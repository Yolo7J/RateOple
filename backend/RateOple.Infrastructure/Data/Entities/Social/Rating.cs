using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Entities;

public class Rating
{
    public Guid Id { get; set; }

    [Required]
    [Range(1, 10)]
    public int Value { get; set; }

    public Guid? UserId { get; set; }

    public Guid? MediaId { get; set; }
    public Guid? SeasonId { get; set; }
    public Guid? EpisodeId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User? User { get; set; }
    public Media? Media { get; set; }
    public Season? Season { get; set; }
    public Episode? Episode { get; set; }
    public Review? Review { get; set; }
}
