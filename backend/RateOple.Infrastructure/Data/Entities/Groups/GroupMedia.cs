using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Entities;

public class GroupMedia
{
    public Guid Id { get; set; }

    [Required]
    public Guid GroupId { get; set; }

    [Required]
    public Guid MediaId { get; set; }

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Group Group { get; set; } = null!;
    public Media Media { get; set; } = null!;
}
