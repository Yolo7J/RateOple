using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Content)
            .IsRequired();

        builder.Property(c => c.ParentType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(c => c.CreatedAt)
            .IsRequired();

        // One User -> Many Comments
        builder.HasOne(c => c.User)
            .WithMany(u => u.Comments)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Polymorphic relationships
        // One Review -> Many Comments
        builder.HasOne(c => c.Review)
            .WithMany(r => r.Comments)
            .HasForeignKey(c => c.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);

        // One GroupPost -> Many Comments
        builder.HasOne(c => c.GroupPost)
            .WithMany(gp => gp.Comments)
            .HasForeignKey(c => c.GroupPostId)
            .OnDelete(DeleteBehavior.Cascade);

        // Self-referencing: One Comment -> Many Replies
        builder.HasOne(c => c.ParentComment)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
