using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class ModeratorAssignmentConfiguration : IEntityTypeConfiguration<ModeratorAssignment>
{
    public void Configure(EntityTypeBuilder<ModeratorAssignment> builder)
    {
        builder.HasKey(x => new { x.UserId, x.ScopeType, x.ScopeId });

        builder.Property(x => x.ScopeType)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(x => x.AssignedAt)
            .IsRequired();

        builder.HasOne(x => x.User)
            .WithMany(u => u.ModeratorAssignments)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.AssignedBy)
            .WithMany(u => u.AssignmentsCreated)
            .HasForeignKey(x => x.AssignedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.AssignedById);
        builder.HasIndex(x => new { x.ScopeType, x.ScopeId });
    }
}
