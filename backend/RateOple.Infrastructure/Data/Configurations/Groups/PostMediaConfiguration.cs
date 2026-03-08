using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class PostMediaConfiguration : IEntityTypeConfiguration<PostMedia>
{
    public void Configure(EntityTypeBuilder<PostMedia> builder)
    {
        builder.HasKey(x => new { x.PostId, x.MediaId });

        builder.HasOne(x => x.Post)
            .WithMany(p => p.MediaLinks)
            .HasForeignKey(x => x.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Media)
            .WithMany(m => m.PostLinks)
            .HasForeignKey(x => x.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.MediaId);
    }
}
