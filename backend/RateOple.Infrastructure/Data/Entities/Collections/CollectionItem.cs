using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Entities;

public class CollectionItem
{
    public Guid Id { get; set; }

    [Required]
    public Guid CollectionId { get; set; }

    [Required]
    public Guid MediaId { get; set; }

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Collection Collection { get; set; } = null!;
    public Media Media { get; set; } = null!;
}
