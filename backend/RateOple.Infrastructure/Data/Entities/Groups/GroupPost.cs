using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Entities;

public class GroupPost
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = null!;

    [Required]
    public string Content { get; set; } = null!;

    public Guid? UserId { get; set; }

    [Required]
    public Guid GroupId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User? User { get; set; }
    public Group Group { get; set; } = null!;
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<PostMedia> MediaLinks { get; set; } = new List<PostMedia>();
}
