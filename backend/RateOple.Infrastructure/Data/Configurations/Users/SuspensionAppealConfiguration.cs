using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class SuspensionAppealConfiguration : IEntityTypeConfiguration<SuspensionAppeal>
{
    public void Configure(EntityTypeBuilder<SuspensionAppeal> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Text)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.ResolutionNote)
            .HasMaxLength(1000);

        builder.HasOne(x => x.User)
            .WithMany(u => u.SuspensionAppeals)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ResolvedByUser)
            .WithMany()
            .HasForeignKey(x => x.ResolvedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => x.CreatedAt);
    }
}
