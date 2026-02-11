using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Models;

public class Season
{
    public Guid Id { get; set; }

    [Required]
    public Guid TvSeriesId { get; set; }

    [Required]
    public int SeasonNumber { get; set; }

    // Navigation Properties
    public TvSeries TvSeries { get; set; } = null!;
    public ICollection<Episode> Episodes { get; set; } = new List<Episode>();
}
