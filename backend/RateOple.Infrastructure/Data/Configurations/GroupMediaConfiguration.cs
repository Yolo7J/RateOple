using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class GroupMediaConfiguration : IEntityTypeConfiguration<GroupMedia>
{
    public void Configure(EntityTypeBuilder<GroupMedia> builder)
    {
        builder.HasKey(gm => gm.Id);

        builder.Property(gm => gm.AddedAt)
            .IsRequired();

        // One Group -> Many GroupMedia
        builder.HasOne(gm => gm.Group)
            .WithMany(g => g.MediaLinks)
            .HasForeignKey(gm => gm.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        // One Media -> Many GroupMedia
        builder.HasOne(gm => gm.Media)
            .WithMany(m => m.GroupLinks)
            .HasForeignKey(gm => gm.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one media per group
        builder.HasIndex(gm => new { gm.GroupId, gm.MediaId })
            .IsUnique();
    }
}
