using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Content)
            .IsRequired();

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        builder.Property(r => r.UpdatedAt)
            .IsRequired();

        // One User -> Many Reviews
        builder.HasOne(r => r.User)
            .WithMany(u => u.Reviews)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // One Media -> Many Reviews
        builder.HasOne(r => r.Media)
            .WithMany(m => m.Reviews)
            .HasForeignKey(r => r.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // One Rating -> One Review
        builder.HasOne(r => r.Rating)
            .WithOne(r => r.Review)
            .HasForeignKey<Review>(r => r.RatingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.RatingId)
            .IsUnique();
    }
}
