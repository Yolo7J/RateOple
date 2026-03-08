using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class Collection
{
    public Guid Id { get; set; }

    [MaxLength(200)]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public Guid? ParentCollectionId { get; set; }

    [Required]
    public CollectionOwnerType OwnerType { get; set; } = CollectionOwnerType.User;

    public Guid? OwnerId { get; set; }

    [Required]
    public CollectionSortMode SortMode { get; set; } = CollectionSortMode.Manual;

    public string? CoverImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Legacy (kept for backward compatibility with previous contracts)
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = null!;

    [Required]
    public CollectionVisibility Visibility { get; set; } = CollectionVisibility.Public;

    // Navigation Properties
    public User? Owner { get; set; }
    public Collection? ParentCollection { get; set; }
    public ICollection<Collection> Children { get; set; } = new List<Collection>();
    public ICollection<CollectionItem> Items { get; set; } = new List<CollectionItem>();
    public ICollection<FollowCollection> Followers { get; set; } = new List<FollowCollection>();
}
