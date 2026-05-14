using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations.Groups;

public class GroupStaffMessageConfiguration : IEntityTypeConfiguration<GroupStaffMessage>
{
    public void Configure(EntityTypeBuilder<GroupStaffMessage> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Content)
            .IsRequired()
            .HasMaxLength(2000);

        builder.HasOne(x => x.Group)
            .WithMany(g => g.StaffMessages)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Author)
            .WithMany()
            .HasForeignKey(x => x.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.GroupId, x.CreatedAt });
    }
}
