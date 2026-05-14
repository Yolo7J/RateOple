using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Core.Contracts;
using RateOple.Core.Collections.DTOs;
using RateOple.Core.Quotas;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Collections.Services;

public class CollectionService : ICollectionService
{
    private readonly ApplicationDbContext _context;
    private readonly IUserQuotaService? _quotaService;
    private const int MaxCollectionNameLength = 40;

    public CollectionService(ApplicationDbContext context, IUserQuotaService? quotaService = null)
    {
        _context = context;
        _quotaService = quotaService;
    }

    public async Task<CollectionDto> CreateAsync(Guid userId, CreateCollectionDto dto)
    {
        var validatedName = ValidateCollectionName(dto.Name);
        var ownerType = dto.OwnerType;
        var ownerId = ResolveOwnerId(userId, dto.OwnerType, dto.OwnerId);

        if (dto.ParentCollectionId.HasValue)
            await EnsureParentExistsAsync(dto.ParentCollectionId.Value);

        if (_quotaService != null)
            await _quotaService.EnsureCanCreateCollectionAsync(userId, ownerType, ownerId, dto.ParentCollectionId);

        var collection = new Collection
        {
            Id = Guid.NewGuid(),
            Name = validatedName,
            Title = validatedName,
            Description = dto.Description?.Trim(),
            ParentCollectionId = dto.ParentCollectionId,
            OwnerType = ownerType,
            OwnerId = ownerId,
            SortMode = dto.SortMode,
            CoverImageUrl = dto.CoverImageUrl?.Trim(),
            Visibility = CollectionVisibility.Public,
            CreatedAt = DateTime.UtcNow
        };

        _context.Collections.Add(collection);
        await _context.SaveChangesAsync();
        return await GetRequiredDtoAsync(collection.Id);
    }

    public async Task<CollectionDto?> GetByIdAsync(Guid id, Guid? viewerId = null)
    {
        var collection = await _context.Collections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
        if (collection == null)
            return null;
        if (!await CanViewAsync(collection, viewerId))
            return null;

        return await GetRequiredDtoAsync(id);
    }

    public async Task<PagedCollectionsDto> QueryAsync(CollectionQueryDto query, Guid? viewerId = null)
    {
        query ??= new CollectionQueryDto();
        var pagination = Pagination.Normalize(query.Page, query.PageSize);
        var q = _context.Collections.AsNoTracking().AsQueryable();

        q = ApplyVisibilityFilter(q, viewerId);

        if (query.OwnerType.HasValue)
            q = q.Where(c => c.OwnerType == query.OwnerType.Value);
        if (query.OwnerId.HasValue)
            q = q.Where(c => c.OwnerId == query.OwnerId.Value);
        if (query.ParentCollectionId.HasValue)
            q = q.Where(c => c.ParentCollectionId == query.ParentCollectionId.Value);

        var total = await q.CountAsync();
        var collections = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToListAsync();

        var items = await MapCollectionsAsync(collections);

        return new PagedCollectionsDto
        {
            Items = items,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<IReadOnlyList<CollectionDto>> GetContainingMediaAsync(Guid mediaId, Guid? viewerId = null)
    {
        var mediaExists = await _context.Media
            .AsNoTracking()
            .AnyAsync(m => m.Id == mediaId && !m.IsDeleted);
        if (!mediaExists)
            throw new KeyNotFoundException("Media not found.");

        var query = _context.Collections
            .AsNoTracking()
            .Where(c => c.Items.Any(i => i.MediaId == mediaId));

        query = ApplyVisibilityFilter(query, viewerId);

        var collections = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return await MapCollectionsAsync(collections);
    }

    public async Task<CollectionDto> UpdateAsync(Guid userId, Guid id, UpdateCollectionDto dto)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Collection not found.");
        await EnsureCanModifyAsync(userId, collection);

        if (dto.Name != null)
        {
            var validatedName = ValidateCollectionName(dto.Name);
            collection.Name = validatedName;
            collection.Title = validatedName;
        }
        if (dto.Description != null) collection.Description = dto.Description.Trim();
        if (dto.ParentCollectionId.HasValue)
        {
            if (dto.ParentCollectionId == id)
                throw new ArgumentException("Collection cannot be its own parent.");

            await EnsureParentExistsAsync(dto.ParentCollectionId.Value);
            await EnsureParentIsNotDescendantAsync(id, dto.ParentCollectionId.Value);
            if (_quotaService != null)
                await _quotaService.EnsureCanMoveCollectionAsync(userId, id, dto.ParentCollectionId.Value);
            collection.ParentCollectionId = dto.ParentCollectionId;
        }
        if (dto.SortMode.HasValue) collection.SortMode = dto.SortMode.Value;
        if (dto.CoverImageUrl != null) collection.CoverImageUrl = dto.CoverImageUrl.Trim();

        await _context.SaveChangesAsync();
        return await GetRequiredDtoAsync(id);
    }

    private static string ValidateCollectionName(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ArgumentException("Collection name is required.");
        if (trimmed.Length > MaxCollectionNameLength)
            throw new ArgumentException($"Collection name must be {MaxCollectionNameLength} characters or fewer.");

        return trimmed;
    }

    public async Task DeleteAsync(Guid userId, Guid id)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Collection not found.");
        await EnsureCanModifyAsync(userId, collection);

        _context.Collections.Remove(collection);
        await _context.SaveChangesAsync();
    }

    public async Task<CollectionDto> AddItemAsync(Guid userId, Guid collectionId, AddCollectionItemDto dto)
    {
        var collection = await _context.Collections
            .FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");
        await EnsureCanModifyAsync(userId, collection);

        var mediaInfo = await _context.Media
            .AsNoTracking()
            .Where(m => m.Id == dto.MediaId && !m.IsDeleted)
            .Select(m => new { m.Id, m.CoverUrl })
            .FirstOrDefaultAsync();
        if (mediaInfo == null)
            throw new KeyNotFoundException("Media not found.");

        var shouldSetCover = string.IsNullOrWhiteSpace(collection.CoverImageUrl) &&
            !await _context.CollectionItems.AnyAsync(i => i.CollectionId == collectionId);

        var exists = await _context.CollectionItems
            .AnyAsync(i => i.CollectionId == collectionId && i.MediaId == dto.MediaId);
        if (exists)
            return await GetRequiredDtoAsync(collectionId);

        if (_quotaService != null)
            await _quotaService.EnsureCanAddCollectionItemAsync(collectionId);

        var nextOrder = dto.OrderIndex ?? (await _context.CollectionItems
            .Where(i => i.CollectionId == collectionId)
            .MaxAsync(i => (int?)i.OrderIndex) ?? 0) + 1;

        _context.CollectionItems.Add(new CollectionItem
        {
            Id = Guid.NewGuid(),
            CollectionId = collectionId,
            MediaId = dto.MediaId,
            OrderIndex = nextOrder,
            AddedAt = DateTime.UtcNow
        });

        if (shouldSetCover && !string.IsNullOrWhiteSpace(mediaInfo.CoverUrl))
            collection.CoverImageUrl = mediaInfo.CoverUrl;

        await _context.SaveChangesAsync();
        return await GetRequiredDtoAsync(collectionId);
    }

    public async Task<CollectionDto> RemoveItemAsync(Guid userId, Guid collectionId, Guid mediaId)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");
        await EnsureCanModifyAsync(userId, collection);

        var item = await _context.CollectionItems
            .FirstOrDefaultAsync(i => i.CollectionId == collectionId && i.MediaId == mediaId);
        if (item != null)
        {
            _context.CollectionItems.Remove(item);
            await _context.SaveChangesAsync();
        }

        return await GetRequiredDtoAsync(collectionId);
    }

    public async Task<CollectionDto> ReorderItemsAsync(Guid userId, Guid collectionId, ReorderCollectionItemsDto dto)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");
        await EnsureCanModifyAsync(userId, collection);

        if (dto.MediaIds == null || dto.MediaIds.Count == 0)
            return await GetRequiredDtoAsync(collectionId);

        if (dto.MediaIds.Count != dto.MediaIds.Distinct().Count())
            throw new ArgumentException("Duplicate media ids are not allowed.");

        var items = await _context.CollectionItems
            .Include(i => i.Media)
            .Where(i => i.CollectionId == collectionId && !i.Media.IsDeleted)
            .ToListAsync();
        var reservedOrderIndexes = await _context.CollectionItems
            .Include(i => i.Media)
            .Where(i => i.CollectionId == collectionId && i.Media.IsDeleted)
            .Select(i => i.OrderIndex)
            .ToHashSetAsync();

        if (items.Count != dto.MediaIds.Count)
            throw new ArgumentException("All collection items must be provided for reordering.");

        var itemsByMedia = items.ToDictionary(i => i.MediaId, i => i);
        foreach (var mediaId in dto.MediaIds)
        {
            if (!itemsByMedia.ContainsKey(mediaId))
                throw new ArgumentException("One or more media items are not part of this collection.");
        }

        await using var tx = await _context.Database.BeginTransactionAsync();

        var tempIndex = -1;
        foreach (var mediaId in dto.MediaIds)
        {
            itemsByMedia[mediaId].OrderIndex = tempIndex;
            tempIndex--;
        }

        await _context.SaveChangesAsync();

        var nextOrderIndex = 1;
        for (var i = 0; i < dto.MediaIds.Count; i++)
        {
            while (reservedOrderIndexes.Contains(nextOrderIndex))
                nextOrderIndex++;

            itemsByMedia[dto.MediaIds[i]].OrderIndex = nextOrderIndex;
            nextOrderIndex++;
        }

        collection.SortMode = CollectionSortMode.Manual;
        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        return await GetRequiredDtoAsync(collectionId);
    }

    public async Task FollowAsync(Guid userId, Guid collectionId)
    {
        var exists = await _context.Collections.AnyAsync(c => c.Id == collectionId);
        if (!exists)
            throw new KeyNotFoundException("Collection not found.");

        var followExists = await _context.FollowCollections
            .AnyAsync(f => f.UserId == userId && f.CollectionId == collectionId);
        if (followExists)
            return;

        if (_quotaService != null)
            await _quotaService.EnsureCanFollowCollectionAsync(userId);

        _context.FollowCollections.Add(new FollowCollection
        {
            UserId = userId,
            CollectionId = collectionId,
            FollowedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();
    }

    public async Task UnfollowAsync(Guid userId, Guid collectionId)
    {
        var follow = await _context.FollowCollections
            .FirstOrDefaultAsync(f => f.UserId == userId && f.CollectionId == collectionId);
        if (follow == null) return;

        _context.FollowCollections.Remove(follow);
        await _context.SaveChangesAsync();
    }

    private static Guid? ResolveOwnerId(Guid userId, CollectionOwnerType ownerType, Guid? dtoOwnerId)
    {
        return ownerType switch
        {
            CollectionOwnerType.System => null,
            CollectionOwnerType.User => dtoOwnerId ?? userId,
            CollectionOwnerType.Group => dtoOwnerId ?? throw new ArgumentException("OwnerId is required for group collections."),
            _ => dtoOwnerId ?? userId
        };
    }

    private async Task EnsureParentExistsAsync(Guid parentId)
    {
        var exists = await _context.Collections.AnyAsync(c => c.Id == parentId);
        if (!exists) throw new KeyNotFoundException("Parent collection not found.");
    }

    private async Task EnsureParentIsNotDescendantAsync(Guid collectionId, Guid parentId)
    {
        var currentParentId = parentId;
        while (true)
        {
            var parent = await _context.Collections
                .AsNoTracking()
                .Where(c => c.Id == currentParentId)
                .Select(c => new { c.Id, c.ParentCollectionId })
                .FirstOrDefaultAsync();

            if (parent == null)
                return;
            if (parent.Id == collectionId)
                throw new ArgumentException("Collection hierarchy cannot contain cycles.");
            if (!parent.ParentCollectionId.HasValue)
                return;

            currentParentId = parent.ParentCollectionId.Value;
        }
    }

    private IQueryable<Collection> ApplyVisibilityFilter(IQueryable<Collection> query, Guid? viewerId)
    {
        if (!viewerId.HasValue)
            return query.Where(c => c.Visibility == CollectionVisibility.Public);

        var userId = viewerId.Value;
        return query.Where(c =>
            c.Visibility == CollectionVisibility.Public ||
            (c.OwnerType == CollectionOwnerType.User && c.OwnerId == userId) ||
            (c.Visibility == CollectionVisibility.Followers && c.Followers.Any(f => f.UserId == userId)) ||
            (c.OwnerType == CollectionOwnerType.Group &&
                c.OwnerId.HasValue &&
                _context.GroupMemberships.Any(m => m.GroupId == c.OwnerId.Value && m.UserId == userId)));
    }

    private async Task<bool> CanViewAsync(Collection collection, Guid? viewerId)
    {
        if (collection.Visibility == CollectionVisibility.Public)
            return true;
        if (!viewerId.HasValue)
            return false;
        if (collection.OwnerType == CollectionOwnerType.User && collection.OwnerId == viewerId.Value)
            return true;
        if (collection.Visibility == CollectionVisibility.Followers)
        {
            return await _context.FollowCollections
                .AnyAsync(f => f.CollectionId == collection.Id && f.UserId == viewerId.Value);
        }
        if (collection.OwnerType == CollectionOwnerType.Group && collection.OwnerId.HasValue)
        {
            return await _context.GroupMemberships
                .AnyAsync(m => m.GroupId == collection.OwnerId.Value && m.UserId == viewerId.Value);
        }

        return false;
    }

    private async Task EnsureCanModifyAsync(Guid userId, Collection collection)
    {
        if (collection.OwnerType == CollectionOwnerType.System)
            throw new UnauthorizedAccessException("System collections are read-only.");
        if (collection.OwnerType == CollectionOwnerType.User && collection.OwnerId != userId)
            throw new UnauthorizedAccessException("You cannot modify this collection.");
        if (collection.OwnerType == CollectionOwnerType.Group)
        {
            if (!collection.OwnerId.HasValue)
                throw new UnauthorizedAccessException("Group collection has no owner id.");

            var role = await _context.GroupMemberships
                .Where(m => m.GroupId == collection.OwnerId.Value && m.UserId == userId)
                .Select(m => (GroupRole?)m.Role)
                .FirstOrDefaultAsync();

            if (role is null || (role != GroupRole.Owner && role != GroupRole.GroupAdmin && role != GroupRole.GroupModerator))
                throw new UnauthorizedAccessException("You cannot modify this group collection.");
        }
    }

    private async Task<CollectionDto> GetRequiredDtoAsync(Guid collectionId)
    {
        var collection = await _context.Collections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");

        var mapped = await MapCollectionsAsync([collection]);
        return mapped[0];
    }

    private async Task<List<CollectionDto>> MapCollectionsAsync(IReadOnlyCollection<Collection> collections)
    {
        if (collections.Count == 0)
            return [];

        var collectionIds = collections.Select(c => c.Id).ToList();

        var followersByCollection = await _context.FollowCollections
            .AsNoTracking()
            .Where(f => collectionIds.Contains(f.CollectionId))
            .GroupBy(f => f.CollectionId)
            .Select(g => new { CollectionId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CollectionId, x => x.Count);

        var collectionItems = await _context.CollectionItems
            .AsNoTracking()
            .Where(i => collectionIds.Contains(i.CollectionId))
            .Include(i => i.Media)
            .ToListAsync();

        var itemsByCollection = collectionItems
            .GroupBy(i => i.CollectionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return collections.Select(c =>
        {
            itemsByCollection.TryGetValue(c.Id, out var currentItems);
            currentItems ??= [];

            var visibleItems = currentItems
                .Where(i => !i.Media.IsDeleted)
                .ToList();

            IEnumerable<CollectionItem> ordered = c.SortMode switch
            {
                CollectionSortMode.Rating => visibleItems.OrderByDescending(i => i.Media.AverageRating).ThenBy(i => i.OrderIndex),
                CollectionSortMode.ReleaseYear => visibleItems.OrderBy(i => i.Media.ReleaseDate).ThenBy(i => i.OrderIndex),
                CollectionSortMode.Duration => visibleItems.OrderBy(i => i.Media.Movie != null ? i.Media.Movie.Duration : null).ThenBy(i => i.OrderIndex),
                CollectionSortMode.Alphabetical => visibleItems.OrderBy(i => i.Media.Title).ThenBy(i => i.OrderIndex),
                _ => visibleItems.OrderBy(i => i.OrderIndex)
            };

            var deletedCoverUrls = currentItems
                .Where(i => i.Media.IsDeleted && !string.IsNullOrWhiteSpace(i.Media.CoverUrl))
                .Select(i => i.Media.CoverUrl)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var visibleCoverUrls = visibleItems
                .Where(i => !string.IsNullOrWhiteSpace(i.Media.CoverUrl))
                .Select(i => i.Media.CoverUrl)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var coverImageUrl = !string.IsNullOrWhiteSpace(c.CoverImageUrl)
                && deletedCoverUrls.Contains(c.CoverImageUrl)
                && !visibleCoverUrls.Contains(c.CoverImageUrl)
                    ? null
                    : c.CoverImageUrl;

            return new CollectionDto
            {
                Id = c.Id,
                Name = string.IsNullOrWhiteSpace(c.Name) ? c.Title : c.Name,
                Description = c.Description,
                ParentCollectionId = c.ParentCollectionId,
                OwnerType = c.OwnerType,
                OwnerId = c.OwnerId,
                SortMode = c.SortMode,
                CoverImageUrl = coverImageUrl,
                CreatedAt = c.CreatedAt,
                FollowersCount = followersByCollection.TryGetValue(c.Id, out var count) ? count : 0,
                Items = ordered.Select(i => new CollectionItemDto
                {
                    MediaId = i.MediaId,
                    OrderIndex = i.OrderIndex,
                    MediaTitle = i.Media.Title,
                    CoverUrl = i.Media.CoverUrl
                }).ToList()
            };
        }).ToList();
    }
}
