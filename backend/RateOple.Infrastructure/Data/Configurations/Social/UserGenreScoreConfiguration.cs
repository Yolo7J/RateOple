using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class UserGenreScoreConfiguration : IEntityTypeConfiguration<UserGenreScore>
{
    public void Configure(EntityTypeBuilder<UserGenreScore> builder)
    {
        builder.HasKey(x => new { x.UserId, x.GenreId });

        builder.Property(x => x.Score)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(u => u.GenreScores)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Genre)
            .WithMany(g => g.UserScores)
            .HasForeignKey(x => x.GenreId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
