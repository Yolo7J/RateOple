using RateOple.Constants.Enums;

namespace RateOple.Core.DTOs;

public class MediaListDto
{
    public Guid Id { get; set; }
    public MediaType Type { get; set; }
    public string Title { get; set; } = null!;
    public DateTime? ReleaseDate { get; set; }
}
