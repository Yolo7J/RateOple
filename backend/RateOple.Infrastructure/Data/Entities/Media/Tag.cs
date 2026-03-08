namespace RateOple.Infrastructure.Data.Entities;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;

    public ICollection<MediaTag> MediaTags { get; set; } = new List<MediaTag>();
}
