using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class FollowCollectionConfiguration : IEntityTypeConfiguration<FollowCollection>
{
    public void Configure(EntityTypeBuilder<FollowCollection> builder)
    {
        builder.HasKey(x => new { x.UserId, x.CollectionId });

        builder.Property(x => x.FollowedAt)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(u => u.FollowedCollections)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Collection)
            .WithMany(c => c.Followers)
            .HasForeignKey(x => x.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.CollectionId);
        builder.HasIndex(x => new { x.UserId, x.FollowedAt });
    }
}
