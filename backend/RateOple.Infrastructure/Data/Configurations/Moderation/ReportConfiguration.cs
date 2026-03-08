using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.TargetType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.Reason)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.HasOne(x => x.Reporter)
            .WithMany(u => u.ReportsCreated)
            .HasForeignKey(x => x.ReporterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ReviewedBy)
            .WithMany(u => u.ReportsReviewed)
            .HasForeignKey(x => x.ReviewedById)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.TargetType, x.TargetId });
        builder.HasIndex(x => new { x.ReporterId, x.TargetType, x.TargetId })
            .IsUnique();
    }
}
