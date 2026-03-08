using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class UserMediaStatusConfiguration : IEntityTypeConfiguration<UserMediaStatus>
{
    public void Configure(EntityTypeBuilder<UserMediaStatus> builder)
    {
        builder.HasKey(x => new { x.UserId, x.MediaId });

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(u => u.MediaStatuses)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Media)
            .WithMany(m => m.UserStatuses)
            .HasForeignKey(x => x.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => x.MediaId);
    }
}
