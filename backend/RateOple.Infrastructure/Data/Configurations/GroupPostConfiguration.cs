using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class GroupPostConfiguration : IEntityTypeConfiguration<GroupPost>
{
    public void Configure(EntityTypeBuilder<GroupPost> builder)
    {
        builder.HasKey(gp => gp.Id);

        builder.Property(gp => gp.Title)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(gp => gp.Content)
            .IsRequired();

        builder.Property(gp => gp.CreatedAt)
            .IsRequired();

        // One User -> Many GroupPosts
        builder.HasOne(gp => gp.User)
            .WithMany(u => u.GroupPosts)
            .HasForeignKey(gp => gp.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // One Group -> Many GroupPosts
        builder.HasOne(gp => gp.Group)
            .WithMany(g => g.Posts)
            .HasForeignKey(gp => gp.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
