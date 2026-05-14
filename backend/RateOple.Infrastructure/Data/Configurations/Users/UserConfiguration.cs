using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{

    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasIndex(u => u.NormalizedUserName)
               .IsUnique(true);

        builder.Property(u => u.DeletedReason)
            .HasMaxLength(200);

        builder.HasIndex(u => u.IsDeleted);
    }
}
