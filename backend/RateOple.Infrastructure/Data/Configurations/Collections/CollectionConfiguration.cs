using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class CollectionConfiguration : IEntityTypeConfiguration<Collection>
{
    public void Configure(EntityTypeBuilder<Collection> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Name)
            .HasMaxLength(200);

        builder.Property(c => c.Visibility)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(c => c.OwnerType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(c => c.SortMode)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(c => c.CoverImageUrl)
            .HasMaxLength(512);

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        // One User (Owner) -> Many Collections
        builder.HasOne(c => c.Owner)
            .WithMany(u => u.Collections)
            .HasForeignKey(c => c.OwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // Hierarchical parent-child
        builder.HasOne(c => c.ParentCollection)
            .WithMany(c => c.Children)
            .HasForeignKey(c => c.ParentCollectionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.ParentCollectionId);
        builder.HasIndex(c => new { c.OwnerType, c.OwnerId });
    }
}
