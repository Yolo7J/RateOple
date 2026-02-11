using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class GroupMembershipConfiguration : IEntityTypeConfiguration<GroupMembership>
{
    public void Configure(EntityTypeBuilder<GroupMembership> builder)
    {
        builder.HasKey(gm => gm.Id);

        builder.Property(gm => gm.Role)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(gm => gm.JoinedAt)
            .IsRequired();

        // One User -> Many GroupMemberships
        builder.HasOne(gm => gm.User)
            .WithMany(u => u.GroupMemberships)
            .HasForeignKey(gm => gm.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // One Group -> Many GroupMemberships
        builder.HasOne(gm => gm.Group)
            .WithMany(g => g.Members)
            .HasForeignKey(gm => gm.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one membership per user per group
        builder.HasIndex(gm => new { gm.UserId, gm.GroupId })
            .IsUnique();
    }
}
