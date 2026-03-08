using RateOple.Constants.Enums;
namespace RateOple.Infrastructure.Data.Entities;

public class Media
{
    public Guid Id { get; set; }
    public MediaType Type { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
    public bool IsDeleted { get; set; } = false;

    // Navigation
    public Movie? Movie { get; set; }
    public Book? Book { get; set; }
    public TvSeries? TvSeries { get; set; }
    public ICollection<MediaGenre> MediaGenres { get; set; } = new List<MediaGenre>();
    public ICollection<Rating> Ratings { get; set; } = new List<Rating>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<CollectionItem> CollectionItems { get; set; } = new List<CollectionItem>();
    public ICollection<GroupMedia> GroupLinks { get; set; } = new List<GroupMedia>();
    public ICollection<MediaInteraction> Interactions { get; set; } = new List<MediaInteraction>();
    public ICollection<UserMediaStatus> UserStatuses { get; set; } = new List<UserMediaStatus>();
}
