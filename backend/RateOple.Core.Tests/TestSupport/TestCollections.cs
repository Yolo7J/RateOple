using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;
using MediaEntity = RateOple.Infrastructure.Data.Entities.Media;

namespace RateOple.Core.Tests.TestSupport;

public sealed class TestCollections
{
    private readonly ApplicationDbContext _context;

    public TestCollections(ApplicationDbContext context)
    {
        _context = context;
    }

    public Collection UserCollection(User owner, string name = "Test Collection", Collection? parent = null)
    {
        return Add(name, CollectionOwnerType.User, owner.Id, parent);
    }

    public Collection GroupCollection(Group owner, string name = "Group Collection", Collection? parent = null)
    {
        return Add(name, CollectionOwnerType.Group, owner.Id, parent);
    }

    public Collection SystemCollection(string name = "System Collection")
    {
        return Add(name, CollectionOwnerType.System, null, null);
    }

    public CollectionItem Item(Collection collection, MediaEntity media, int orderIndex = 1)
    {
        var item = new CollectionItem
        {
            Id = Guid.NewGuid(),
            CollectionId = collection.Id,
            MediaId = media.Id,
            OrderIndex = orderIndex,
            AddedAt = DateTime.UtcNow
        };

        _context.CollectionItems.Add(item);
        return item;
    }

    public FollowCollection Follow(User user, Collection collection)
    {
        var follow = new FollowCollection
        {
            UserId = user.Id,
            CollectionId = collection.Id,
            FollowedAt = DateTime.UtcNow
        };

        _context.FollowCollections.Add(follow);
        return follow;
    }

    private Collection Add(string name, CollectionOwnerType ownerType, Guid? ownerId, Collection? parent)
    {
        var collection = new Collection
        {
            Id = Guid.NewGuid(),
            Name = name,
            Title = name,
            Description = $"{name} description",
            ParentCollectionId = parent?.Id,
            OwnerType = ownerType,
            OwnerId = ownerId,
            SortMode = CollectionSortMode.Manual,
            Visibility = CollectionVisibility.Public,
            CreatedAt = DateTime.UtcNow
        };

        _context.Collections.Add(collection);
        return collection;
    }
}
