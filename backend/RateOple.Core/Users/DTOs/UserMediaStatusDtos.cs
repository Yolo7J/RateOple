namespace RateOple.Core.Users.DTOs;

public class SetUserMediaStatusDto
{
    public string Status { get; set; } = "Plan";
    public int? ProgressPages { get; set; }
    public int? ProgressSeason { get; set; }
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
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
}
