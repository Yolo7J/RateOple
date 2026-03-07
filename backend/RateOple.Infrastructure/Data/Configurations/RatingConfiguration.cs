using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class RatingConfiguration : IEntityTypeConfiguration<Rating>
{
    public void Configure(EntityTypeBuilder<Rating> builder)
    {
        builder.HasKey(r => r.Id);
        
        builder.ToTable(t => t.HasCheckConstraint("CK_Rating_Value_Range", "\"Value\" >= 1 AND \"Value\" <= 10"));

        builder.Property(r => r.Value)
            .IsRequired();

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        builder.Property(r => r.UpdatedAt)
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

        // One Season -> Many Ratings
        builder.HasOne(r => r.Season)
            .WithMany(s => s.Ratings)
            .HasForeignKey(r => r.SeasonId)
            .OnDelete(DeleteBehavior.Cascade);

        // One Episode -> Many Ratings
        builder.HasOne(r => r.Episode)
            .WithMany(e => e.Ratings)
            .HasForeignKey(r => r.EpisodeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Exactly one target must be selected (Media OR Season OR Episode)
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Rating_ExactlyOneTarget",
            @"(
                (CASE WHEN ""MediaId"" IS NOT NULL THEN 1 ELSE 0 END) +
                (CASE WHEN ""SeasonId"" IS NOT NULL THEN 1 ELSE 0 END) +
                (CASE WHEN ""EpisodeId"" IS NOT NULL THEN 1 ELSE 0 END)
            ) = 1"));

        // Unique per target per user
        builder.HasIndex(r => new { r.UserId, r.MediaId })
            .IsUnique()
            .HasFilter(@"""MediaId"" IS NOT NULL");

        builder.HasIndex(r => new { r.UserId, r.SeasonId })
            .IsUnique()
            .HasFilter(@"""SeasonId"" IS NOT NULL");

        builder.HasIndex(r => new { r.UserId, r.EpisodeId })
            .IsUnique()
            .HasFilter(@"""EpisodeId"" IS NOT NULL");
    }
}
