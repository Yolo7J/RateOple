using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class MediaInteractionConfiguration : IEntityTypeConfiguration<MediaInteraction>
{
    public void Configure(EntityTypeBuilder<MediaInteraction> builder)
    {
        builder.HasKey(mi => mi.Id);

        builder.Property(mi => mi.InteractionType).IsRequired();
        builder.Property(mi => mi.Points).IsRequired();
        builder.Property(mi => mi.CreatedAt).IsRequired();

        builder.HasOne(mi => mi.User)
            .WithMany(u => u.MediaInteractions)
            .HasForeignKey(mi => mi.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mi => mi.Media)
            .WithMany(m => m.Interactions)
            .HasForeignKey(mi => mi.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mi => mi.Season)
            .WithMany(s => s.Interactions)
            .HasForeignKey(mi => mi.SeasonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mi => mi.Episode)
            .WithMany(e => e.Interactions)
            .HasForeignKey(mi => mi.EpisodeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(mi => new { mi.UserId, mi.CreatedAt });
        builder.HasIndex(mi => mi.MediaId);
        builder.HasIndex(mi => mi.SeasonId);
        builder.HasIndex(mi => mi.EpisodeId);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_MediaInteraction_ExactlyOneTarget",
            @"(
                (CASE WHEN ""MediaId"" IS NOT NULL THEN 1 ELSE 0 END) +
                (CASE WHEN ""SeasonId"" IS NOT NULL THEN 1 ELSE 0 END) +
                (CASE WHEN ""EpisodeId"" IS NOT NULL THEN 1 ELSE 0 END)
            ) = 1"));
    }
}
