using System.ComponentModel.DataAnnotations;

namespace RateOple.Core.Users.DTOs;

public class SetUserMediaStatusDto
{
    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "Plan";
    [Range(0, int.MaxValue)]
    public int? ProgressPages { get; set; }
    [Range(0, int.MaxValue)]
    public int? ProgressSeason { get; set; }
    [Range(0, int.MaxValue)]
    public int? ProgressEpisode { get; set; }
}

public class UserMediaStatusDto
{
    public Guid MediaId { get; set; }
    public string MediaType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public string Status { get; set; } = "Plan";
    public int? ProgressPages { get; set; }
    public int? ProgressSeason { get; set; }
    public int? ProgressEpisode { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MediaStatusQueryDto
{
    [MaxLength(32)]
    public string? Status { get; set; }
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 50;
}
