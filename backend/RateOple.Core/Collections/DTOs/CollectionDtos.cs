using System.ComponentModel.DataAnnotations;
using RateOple.Constants.Enums;
using RateOple.Core.Validation;

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
    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? Description { get; set; }
    [NotEmptyGuid]
    public Guid? ParentCollectionId { get; set; }
    [EnumDataType(typeof(CollectionOwnerType))]
    public CollectionOwnerType OwnerType { get; set; } = CollectionOwnerType.User;
    [NotEmptyGuid]
    public Guid? OwnerId { get; set; }
    [EnumDataType(typeof(CollectionSortMode))]
    public CollectionSortMode SortMode { get; set; } = CollectionSortMode.ReleaseYear;
    [Url]
    [MaxLength(2048)]
    public string? CoverImageUrl { get; set; }
}

public class UpdateCollectionDto
{
    [MaxLength(80)]
    public string? Name { get; set; }
    [MaxLength(1000)]
    public string? Description { get; set; }
    [NotEmptyGuid]
    public Guid? ParentCollectionId { get; set; }
    [EnumDataType(typeof(CollectionSortMode))]
    public CollectionSortMode? SortMode { get; set; }
    [Url]
    [MaxLength(2048)]
    public string? CoverImageUrl { get; set; }
}

public class AddCollectionItemDto
{
    [NotEmptyGuid]
    public Guid MediaId { get; set; }

    [Range(0, int.MaxValue)]
    public int? OrderIndex { get; set; }
}

public class ReorderCollectionItemsDto : IValidatableObject
{
    public List<Guid> MediaIds { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MediaIds.Count == 0)
            yield return new ValidationResult("At least one media id is required.", [nameof(MediaIds)]);

        if (MediaIds.Any(id => id == Guid.Empty))
            yield return new ValidationResult("Media ids must not contain empty GUID values.", [nameof(MediaIds)]);

        if (MediaIds.Distinct().Count() != MediaIds.Count)
            yield return new ValidationResult("Media ids must not contain duplicates.", [nameof(MediaIds)]);
    }
}

public class CollectionQueryDto
{
    [EnumDataType(typeof(CollectionOwnerType))]
    public CollectionOwnerType? OwnerType { get; set; }
    [NotEmptyGuid]
    public Guid? OwnerId { get; set; }
    [NotEmptyGuid]
    public Guid? ParentCollectionId { get; set; }
    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;
    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public class PagedCollectionsDto
{
    public List<CollectionDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
