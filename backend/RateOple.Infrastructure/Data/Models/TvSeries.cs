namespace RateOple.Infrastructure.Data.Models;

public class TvSeries
{
    public Guid MediaId { get; set; }

    public int? SeasonsCount { get; set; }

    public Media Media { get; set; } = null!;
}
