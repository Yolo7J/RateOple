using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class SeasonConfiguration : IEntityTypeConfiguration<Season>
{
    public void Configure(EntityTypeBuilder<Season> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.SeasonNumber)
            .IsRequired();

        // One TvSeries -> Many Seasons
        builder.HasOne(s => s.TvSeries)
            .WithMany(tv => tv.Seasons)
            .HasForeignKey(s => s.TvSeriesId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: one season number per TV series
        builder.HasIndex(s => new { s.TvSeriesId, s.SeasonNumber })
            .IsUnique();
    }
}
