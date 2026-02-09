using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RateOple.Infrastructure.Data.Models;

namespace RateOple.Infrastructure.Data.Configurations;

public class TvSeriesConfiguration : IEntityTypeConfiguration<TvSeries>
{
    public void Configure(EntityTypeBuilder<TvSeries> builder)
    {
        builder.HasKey(x => x.MediaId);
    }
}
