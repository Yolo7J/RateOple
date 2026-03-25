using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class ModerationAuditLogConfiguration : IEntityTypeConfiguration<ModerationAuditLog>
{
    public void Configure(EntityTypeBuilder<ModerationAuditLog> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Action)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.Notes)
            .HasMaxLength(1000);

        builder.HasOne(x => x.PerformedBy)
            .WithMany(u => u.ModerationAuditLogs)
            .HasForeignKey(x => x.PerformedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Action);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => x.PerformedById);
    }
}
