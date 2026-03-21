using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations.Groups;

public class GroupBanConfiguration : IEntityTypeConfiguration<GroupBan>
{
    public void Configure(EntityTypeBuilder<GroupBan> builder)
    {
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.GroupId, x.UserId }).IsUnique();

        builder.HasOne(x => x.Group)
            .WithMany(g => g.Bans)
            .HasForeignKey(x => x.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.BannedBy)
            .WithMany()
            .HasForeignKey(x => x.BannedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RevokedBy)
            .WithMany()
            .HasForeignKey(x => x.RevokedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
