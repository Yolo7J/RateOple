namespace RateOple.Infrastructure.Data.Entities;

public class TvSeries
{
    public Guid MediaId { get; set; }
    public int? SeasonsCount { get; set; }
    public int? TmdbId { get; set; }

    // Navigation
    public Media Media { get; set; } = null!;
    public ICollection<Season> Seasons { get; set; } = new List<Season>();
}