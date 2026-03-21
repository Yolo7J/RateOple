using RateOple.Constants.Enums;

namespace RateOple.Core.Collections.DTOs;

public class CollectionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCollectionId { get; set; }
    public CollectionOwnerType OwnerType { get; set; }
    public Guid? OwnerId { get; set; }
    public CollectionSortMode SortMode { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public int FollowersCount { get; set; }
    public List<CollectionItemDto> Items { get; set; } = [];
}

public class CollectionItemDto
{
    public Guid MediaId { get; set; }
    public int OrderIndex { get; set; }
    public string MediaTitle { get; set; } = string.Empty;
    public string? CoverUrl { get; set; }
}

public class CreateCollectionDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCollectionId { get; set; }
    public CollectionOwnerType OwnerType { get; set; } = CollectionOwnerType.User;
    public Guid? OwnerId { get; set; }
    public CollectionSortMode SortMode { get; set; } = CollectionSortMode.ReleaseYear;
    public string? CoverImageUrl { get; set; }
}

public class UpdateCollectionDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public Guid? ParentCollectionId { get; set; }
    public CollectionSortMode? SortMode { get; set; }
    public string? CoverImageUrl { get; set; }
}

public class AddCollectionItemDto
{
    public Guid MediaId { get; set; }
    public int? OrderIndex { get; set; }
}

public class ReorderCollectionItemsDto
{
    public List<Guid> MediaIds { get; set; } = [];
}

public class CollectionQueryDto
{
    public CollectionOwnerType? OwnerType { get; set; }
    public Guid? OwnerId { get; set; }
    public Guid? ParentCollectionId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class PagedCollectionsDto
{
    public List<CollectionDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
