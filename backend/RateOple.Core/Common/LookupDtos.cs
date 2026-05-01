using RateOple.Constants.Enums;

namespace RateOple.Core.Common;

public class PagedLookupDto<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class MediaLookupItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public string Subtitle { get; set; } = string.Empty;
    public double AverageRating { get; set; }
    public int RatingsCount { get; set; }
}

public class UserLookupItemDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Subtitle { get; set; } = string.Empty;
}

public class GroupLookupItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Visibility { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string Subtitle { get; set; } = string.Empty;
}

public class CollectionLookupItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OwnerDisplayName { get; set; } = string.Empty;
    public string Visibility { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Subtitle { get; set; } = string.Empty;
}

public class ScopeLookupItemDto
{
    public Guid Id { get; set; }
    public ModeratorScopeType Type { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
