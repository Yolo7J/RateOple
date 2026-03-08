using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;

namespace RateOple.Infrastructure.Data.Entities;

public class Group
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    [Required]
    public GroupVisibility Visibility { get; set; } = GroupVisibility.Public;

    [Required]
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public User Owner { get; set; } = null!;
    public ICollection<GroupMembership> Members { get; set; } = new List<GroupMembership>();
    public ICollection<GroupPost> Posts { get; set; } = new List<GroupPost>();
    public ICollection<GroupMedia> MediaLinks { get; set; } = new List<GroupMedia>();
}
