using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class MediaTagConfiguration : IEntityTypeConfiguration<MediaTag>
{
    public void Configure(EntityTypeBuilder<MediaTag> builder)
    {
        builder.HasKey(x => new { x.MediaId, x.TagId });

        builder.HasOne(x => x.Media)
            .WithMany(m => m.MediaTags)
            .HasForeignKey(x => x.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Tag)
            .WithMany(t => t.MediaTags)
            .HasForeignKey(x => x.TagId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.TagId);
    }
}
