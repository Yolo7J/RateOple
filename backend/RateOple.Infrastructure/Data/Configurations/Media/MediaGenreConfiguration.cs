using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class MediaGenreConfiguration : IEntityTypeConfiguration<MediaGenre>
{
    public void Configure(EntityTypeBuilder<MediaGenre> builder)
    {
        builder.HasKey(x => new { x.MediaId, x.GenreId });

        builder.HasOne(x => x.Media)
            .WithMany(x => x.MediaGenres)
            .HasForeignKey(x => x.MediaId);

        builder.HasOne(x => x.Genre)
            .WithMany(x => x.MediaGenres)
            .HasForeignKey(x => x.GenreId);
    }
}