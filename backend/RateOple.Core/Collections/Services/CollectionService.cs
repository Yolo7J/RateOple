using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Contracts.DTOs.Collections;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Services;

public class CollectionService : ICollectionService
{
    private readonly ApplicationDbContext _context;

    public CollectionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CollectionDto> CreateAsync(Guid userId, CreateCollectionDto dto)
    {
        var ownerType = dto.OwnerType;
        var ownerId = ResolveOwnerId(userId, dto.OwnerType, dto.OwnerId);

        if (dto.ParentCollectionId.HasValue)
            await EnsureParentExistsAsync(dto.ParentCollectionId.Value);

        var collection = new Collection
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Title = dto.Name.Trim(),
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

        return await GetRequiredDtoAsync(id);
    }

    public async Task<PagedCollectionsDto> QueryAsync(CollectionQueryDto query, Guid? viewerId = null)
    {
        var q = _context.Collections.AsNoTracking().AsQueryable();

        if (query.OwnerType.HasValue)
            q = q.Where(c => c.OwnerType == query.OwnerType.Value);
        if (query.OwnerId.HasValue)
            q = q.Where(c => c.OwnerId == query.OwnerId.Value);
        if (query.ParentCollectionId.HasValue)
            q = q.Where(c => c.ParentCollectionId == query.ParentCollectionId.Value);

        var total = await q.CountAsync();
        var collections = await q
            .OrderByDescending(c => c.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

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

        var items = collections.Select(c =>
        {
            itemsByCollection.TryGetValue(c.Id, out var currentItems);
            currentItems ??= [];

            IEnumerable<CollectionItem> ordered = c.SortMode switch
            {
                CollectionSortMode.Rating => currentItems.OrderByDescending(i => i.Media.AverageRating).ThenBy(i => i.OrderIndex),
                CollectionSortMode.ReleaseYear => currentItems.OrderByDescending(i => i.Media.ReleaseDate).ThenBy(i => i.OrderIndex),
                CollectionSortMode.Duration => currentItems.OrderBy(i => i.Media.Movie != null ? i.Media.Movie.Duration : null).ThenBy(i => i.OrderIndex),
                CollectionSortMode.Alphabetical => currentItems.OrderBy(i => i.Media.Title).ThenBy(i => i.OrderIndex),
                _ => currentItems.OrderBy(i => i.OrderIndex)
            };

            return new CollectionDto
            {
                Id = c.Id,
                Name = string.IsNullOrWhiteSpace(c.Name) ? c.Title : c.Name,
                Description = c.Description,
                ParentCollectionId = c.ParentCollectionId,
                OwnerType = c.OwnerType,
                OwnerId = c.OwnerId,
                SortMode = c.SortMode,
                CoverImageUrl = c.CoverImageUrl,
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

        return new PagedCollectionsDto
        {
            Items = items,
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<CollectionDto> UpdateAsync(Guid userId, Guid id, UpdateCollectionDto dto)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Collection not found.");
        EnsureCanModify(userId, collection);

        if (dto.Name != null)
        {
            collection.Name = dto.Name.Trim();
            collection.Title = collection.Name;
        }
        if (dto.Description != null) collection.Description = dto.Description.Trim();
        if (dto.ParentCollectionId.HasValue && dto.ParentCollectionId != id)
        {
            await EnsureParentExistsAsync(dto.ParentCollectionId.Value);
            collection.ParentCollectionId = dto.ParentCollectionId;
        }
        if (dto.SortMode.HasValue) collection.SortMode = dto.SortMode.Value;
        if (dto.CoverImageUrl != null) collection.CoverImageUrl = dto.CoverImageUrl.Trim();

        await _context.SaveChangesAsync();
        return await GetRequiredDtoAsync(id);
    }

    public async Task DeleteAsync(Guid userId, Guid id)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new KeyNotFoundException("Collection not found.");
        EnsureCanModify(userId, collection);

        _context.Collections.Remove(collection);
        await _context.SaveChangesAsync();
    }

    public async Task<CollectionDto> AddItemAsync(Guid userId, Guid collectionId, AddCollectionItemDto dto)
    {
        var collection = await _context.Collections
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");
        EnsureCanModify(userId, collection);

        var mediaExists = await _context.Media.AnyAsync(m => m.Id == dto.MediaId && !m.IsDeleted);
        if (!mediaExists)
            throw new KeyNotFoundException("Media not found.");

        var exists = collection.Items.Any(i => i.MediaId == dto.MediaId);
        if (exists)
            return await GetRequiredDtoAsync(collectionId);

        var nextOrder = dto.OrderIndex ?? (collection.Items.Count == 0 ? 1 : collection.Items.Max(i => i.OrderIndex) + 1);
        collection.Items.Add(new CollectionItem
        {
            Id = Guid.NewGuid(),
            CollectionId = collectionId,
            MediaId = dto.MediaId,
            OrderIndex = nextOrder,
            AddedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        return await GetRequiredDtoAsync(collectionId);
    }

    public async Task<CollectionDto> RemoveItemAsync(Guid userId, Guid collectionId, Guid mediaId)
    {
        var collection = await _context.Collections.FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");
        EnsureCanModify(userId, collection);

        var item = await _context.CollectionItems
            .FirstOrDefaultAsync(i => i.CollectionId == collectionId && i.MediaId == mediaId);
        if (item != null)
        {
            _context.CollectionItems.Remove(item);
            await _context.SaveChangesAsync();
        }

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

    private static void EnsureCanModify(Guid userId, Collection collection)
    {
        if (collection.OwnerType == CollectionOwnerType.System)
            throw new UnauthorizedAccessException("System collections are read-only.");
        if (collection.OwnerType == CollectionOwnerType.User && collection.OwnerId != userId)
            throw new UnauthorizedAccessException("You cannot modify this collection.");
    }

    private async Task<CollectionDto> GetRequiredDtoAsync(Guid collectionId)
    {
        var collection = await _context.Collections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == collectionId)
            ?? throw new KeyNotFoundException("Collection not found.");

        var followersCount = await _context.FollowCollections
            .CountAsync(f => f.CollectionId == collectionId);

        var itemQuery = _context.CollectionItems
            .AsNoTracking()
            .Where(i => i.CollectionId == collectionId)
            .Include(i => i.Media)
            .AsQueryable();

        itemQuery = collection.SortMode switch
        {
            CollectionSortMode.Rating => itemQuery.OrderByDescending(i => i.Media.AverageRating).ThenBy(i => i.OrderIndex),
            CollectionSortMode.ReleaseYear => itemQuery.OrderByDescending(i => i.Media.ReleaseDate).ThenBy(i => i.OrderIndex),
            CollectionSortMode.Duration => itemQuery.OrderBy(i => i.Media.Movie != null ? i.Media.Movie.Duration : null).ThenBy(i => i.OrderIndex),
            CollectionSortMode.Alphabetical => itemQuery.OrderBy(i => i.Media.Title).ThenBy(i => i.OrderIndex),
            _ => itemQuery.OrderBy(i => i.OrderIndex)
        };

        var items = await itemQuery
            .Select(i => new CollectionItemDto
            {
                MediaId = i.MediaId,
                OrderIndex = i.OrderIndex,
                MediaTitle = i.Media.Title,
                CoverUrl = i.Media.CoverUrl
            })
            .ToListAsync();

        return new CollectionDto
        {
            Id = collection.Id,
            Name = string.IsNullOrWhiteSpace(collection.Name) ? collection.Title : collection.Name,
            Description = collection.Description,
            ParentCollectionId = collection.ParentCollectionId,
            OwnerType = collection.OwnerType,
            OwnerId = collection.OwnerId,
            SortMode = collection.SortMode,
            CoverImageUrl = collection.CoverImageUrl,
            CreatedAt = collection.CreatedAt,
            FollowersCount = followersCount,
            Items = items
        };
    }
}
