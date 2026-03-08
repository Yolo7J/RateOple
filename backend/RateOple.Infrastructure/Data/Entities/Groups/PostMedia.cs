namespace RateOple.Infrastructure.Data.Entities;

public class PostMedia
{
    public Guid PostId { get; set; }
    public Guid MediaId { get; set; }

    public GroupPost Post { get; set; } = null!;
    public Media Media { get; set; } = null!;
}
