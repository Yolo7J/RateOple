using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
               .IsRequired()
               .HasMaxLength(256);

        builder.Property(x => x.Type)
               .IsRequired();

        builder.Property(x => x.CreatedAt)
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.HasOne(x => x.Movie)
               .WithOne(x => x.Media)
               .HasForeignKey<Movie>(x => x.MediaId);

        builder.HasOne(x => x.Book)
               .WithOne(x => x.Media)
               .HasForeignKey<Book>(x => x.MediaId);

        builder.HasOne(x => x.TvSeries)
               .WithOne(x => x.Media)
               .HasForeignKey<TvSeries>(x => x.MediaId);

        builder.HasIndex(x => x.Type);
        builder.HasIndex(x => x.Title);
        
        builder.Property(x => x.AverageRating)
               .HasDefaultValue(0);
               
        builder.Property(x => x.RatingsCount)
               .HasDefaultValue(0);

        builder.HasIndex(x => x.AverageRating);
    }
}
