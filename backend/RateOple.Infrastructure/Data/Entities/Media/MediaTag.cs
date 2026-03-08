namespace RateOple.Infrastructure.Data.Entities;

public class MediaTag
{
    public Guid MediaId { get; set; }
    public int TagId { get; set; }

    public Media Media { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
