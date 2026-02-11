using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Models;

public class Collection
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    [Required]
    public CollectionVisibility Visibility { get; set; } = CollectionVisibility.Public;

    [Required]
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User Owner { get; set; } = null!;
    public ICollection<CollectionItem> Items { get; set; } = new List<CollectionItem>();
}
