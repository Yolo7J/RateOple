using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RateOple.Infrastructure.Data.Entities
{
    public class Follow
    {
        [Key]
        public Guid Id { get; set; }

        [Required]
        public Guid FollowerId { get; set; }

        [Required]
        public Guid FollowingId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(FollowerId))]
        public User Follower { get; set; } = null!;

        [ForeignKey(nameof(FollowingId))]
        public User Following { get; set; } = null!;
    }
}
