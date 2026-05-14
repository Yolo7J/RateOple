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
    public bool IsArchived { get; set; }
    public DateTime? ArchivedAt { get; set; }

    // Navigation Properties
    public User Owner { get; set; } = null!;
    public ICollection<GroupMembership> Members { get; set; } = new List<GroupMembership>();
    public ICollection<GroupPost> Posts { get; set; } = new List<GroupPost>();
    public ICollection<GroupMedia> MediaLinks { get; set; } = new List<GroupMedia>();
    public ICollection<GroupPostVote> PostVotes { get; set; } = new List<GroupPostVote>();
    public ICollection<GroupBan> Bans { get; set; } = new List<GroupBan>();
    public ICollection<GroupStaffMessage> StaffMessages { get; set; } = new List<GroupStaffMessage>();
}
