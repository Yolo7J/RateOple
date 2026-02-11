using System.ComponentModel.DataAnnotations;

namespace RateOple.Infrastructure.Data.Models;

public class Episode
{
    public Guid Id { get; set; }

    [Required]
    public Guid SeasonId { get; set; }

    [Required]
    public int EpisodeNumber { get; set; }

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = null!;

    public int? Duration { get; set; } // in minutes

    // Navigation Properties
    public Season Season { get; set; } = null!;
}
