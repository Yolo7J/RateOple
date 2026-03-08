using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class Comment
{
    public Guid Id { get; set; }

    [Required]
    public string Content { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }

    // Polymorphic parent relationship
    public CommentParentType ParentType { get; set; }
    
    // Nullable foreign keys for polymorphic relationships
    public Guid? ReviewId { get; set; }
    public Guid? GroupPostId { get; set; }
    public Guid? ParentCommentId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User User { get; set; } = null!;
    public Review? Review { get; set; }
    public GroupPost? GroupPost { get; set; }
    public Comment? ParentComment { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
