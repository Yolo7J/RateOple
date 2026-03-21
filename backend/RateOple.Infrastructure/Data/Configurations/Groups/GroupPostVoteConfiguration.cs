using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations.Groups;

public class GroupPostVoteConfiguration : IEntityTypeConfiguration<GroupPostVote>
{
    public void Configure(EntityTypeBuilder<GroupPostVote> builder)
    {
        builder.HasKey(v => new { v.GroupPostId, v.UserId });

        builder.Property(v => v.Value)
            .IsRequired();

        builder.HasOne(v => v.Post)
            .WithMany(p => p.Votes)
            .HasForeignKey(v => v.GroupPostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
