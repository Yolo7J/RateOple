using System.ComponentModel.DataAnnotations;
namespace RateOple.Infrastructure.Data.Entities;

public class Season
{
    public Guid Id { get; set; }

    [Required]
    public Guid TvSeriesId { get; set; }

    [Required]
    public int SeasonNumber { get; set; }

    public bool IsDeleted { get; set; } = false;

    // Navigation
    public TvSeries TvSeries { get; set; } = null!;
    public ICollection<Episode> Episodes { get; set; } = new List<Episode>();
    public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
    public ICollection<MediaInteraction> Interactions { get; set; } = new List<MediaInteraction>();
}
