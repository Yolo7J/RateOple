using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Entities;

public class Review
{
    public Guid Id { get; set; }

    [Required]
    public string Content { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    [Required]
    public Guid MediaId { get; set; }

    [Required]
    public Guid RatingId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User User { get; set; } = null!;
    public Media Media { get; set; } = null!;
    public Rating Rating { get; set; } = null!;
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
}
