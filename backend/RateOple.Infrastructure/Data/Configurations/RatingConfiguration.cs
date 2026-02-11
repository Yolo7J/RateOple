using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class RatingConfiguration : IEntityTypeConfiguration<Rating>
{
    public void Configure(EntityTypeBuilder<Rating> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Value)
            .IsRequired();

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        // One User -> Many Ratings
        builder.HasOne(r => r.User)
            .WithMany(u => u.Ratings)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // One Media -> Many Ratings
        builder.HasOne(r => r.Media)
            .WithMany(m => m.Ratings)
            .HasForeignKey(r => r.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one rating per user per media
        builder.HasIndex(r => new { r.UserId, r.MediaId })
            .IsUnique();
    }
}
