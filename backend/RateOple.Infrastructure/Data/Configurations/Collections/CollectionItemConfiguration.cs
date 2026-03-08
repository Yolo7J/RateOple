using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class CollectionItemConfiguration : IEntityTypeConfiguration<CollectionItem>
{
    public void Configure(EntityTypeBuilder<CollectionItem> builder)
    {
        builder.HasKey(ci => ci.Id);

        builder.Property(ci => ci.AddedAt)
            .IsRequired();

        builder.Property(ci => ci.OrderIndex)
            .IsRequired();

        // One Collection -> Many CollectionItems
        builder.HasOne(ci => ci.Collection)
            .WithMany(c => c.Items)
            .HasForeignKey(ci => ci.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);

        // One Media -> Many CollectionItems
        builder.HasOne(ci => ci.Media)
            .WithMany(m => m.CollectionItems)
            .HasForeignKey(ci => ci.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one media per collection
        builder.HasIndex(ci => new { ci.CollectionId, ci.MediaId })
            .IsUnique();

        builder.HasIndex(ci => new { ci.CollectionId, ci.OrderIndex })
            .IsUnique();
    }
}
