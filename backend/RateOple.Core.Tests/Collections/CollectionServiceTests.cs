using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Collections.DTOs;
using RateOple.Core.Collections.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Collections;

public class CollectionServiceTests
{
    [Fact]
    public async Task CreateAsync_UserOwnerCreatesCollection()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("collection-owner"));
        await data.SaveAsync();
        var service = CreateService(db);

        var collection = await service.CreateAsync(owner.Id, new CreateCollectionDto
        {
            Name = "  Favorites  ",
            Description = " good media ",
            OwnerType = CollectionOwnerType.User
        });

        Assert.Equal("Favorites", collection.Name);
        Assert.Equal(owner.Id, collection.OwnerId);
        Assert.Equal(CollectionOwnerType.User, collection.OwnerType);
    }

    [Fact]
    public async Task UpdateAsync_OnlyOwnerCanUpdateUserCollection()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var outsider = data.Users.Add(data.Users.Normal("collection-outsider"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateAsync(
            outsider.Id,
            collection.Id,
            new UpdateCollectionDto { Name = "Blocked" }));

        var updated = await service.UpdateAsync(collection.OwnerId!.Value, collection.Id, new UpdateCollectionDto
        {
            Name = "Updated"
        });

        Assert.Equal("Updated", updated.Name);
    }

    [Fact]
    public async Task DeleteAsync_NonOwnerCannotDelete()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var outsider = data.Users.Add(data.Users.Normal("delete-outsider"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteAsync(outsider.Id, collection.Id));

        Assert.True(await db.Context.Collections.AnyAsync(c => c.Id == collection.Id));
    }

    [Fact]
    public async Task SystemCollection_IsReadOnly()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var user = data.Users.Add(data.Users.Normal("system-editor"));
        var collection = data.Collections.SystemCollection();
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateAsync(
            user.Id,
            collection.Id,
            new UpdateCollectionDto { Name = "Nope" }));
    }

    [Fact]
    public async Task AddItemAsync_OwnerAddsMediaAndDuplicateIsIdempotent()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var media = data.Media.Movie("Collected Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        var first = await service.AddItemAsync(collection.OwnerId!.Value, collection.Id, new AddCollectionItemDto
        {
            MediaId = media.Id
        });
        var second = await service.AddItemAsync(collection.OwnerId!.Value, collection.Id, new AddCollectionItemDto
        {
            MediaId = media.Id
        });

        Assert.Single(first.Items);
        Assert.Single(second.Items);
        Assert.Equal(media.Id, second.Items[0].MediaId);
    }

    [Fact]
    public async Task AddItemAsync_RejectsNonOwnerAndMissingMedia()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var outsider = data.Users.Add(data.Users.Normal("item-outsider"));
        var media = data.Media.Movie("Blocked Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.AddItemAsync(
            outsider.Id,
            collection.Id,
            new AddCollectionItemDto { MediaId = media.Id }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AddItemAsync(
            collection.OwnerId!.Value,
            collection.Id,
            new AddCollectionItemDto { MediaId = Guid.NewGuid() }));
    }

    [Fact]
    public async Task RemoveItemAsync_OnlyOwnerCanRemove()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var outsider = data.Users.Add(data.Users.Normal("remove-outsider"));
        var media = data.Media.Movie("Removed Movie");
        data.Collections.Item(collection, media);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.RemoveItemAsync(outsider.Id, collection.Id, media.Id));

        var updated = await service.RemoveItemAsync(collection.OwnerId!.Value, collection.Id, media.Id);
        Assert.Empty(updated.Items);
    }

    [Fact]
    public async Task ReorderItemsAsync_RequiresAllItemsWithoutDuplicates()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var collection = await db.Context.Collections.SingleAsync();
        var first = data.Media.Movie("First");
        var second = data.Media.Movie("Second");
        data.Collections.Item(collection, first, 1);
        data.Collections.Item(collection, second, 2);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.ReorderItemsAsync(
            collection.OwnerId!.Value,
            collection.Id,
            new ReorderCollectionItemsDto { MediaIds = [first.Id, first.Id] }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.ReorderItemsAsync(
            collection.OwnerId!.Value,
            collection.Id,
            new ReorderCollectionItemsDto { MediaIds = [first.Id] }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.ReorderItemsAsync(
            collection.OwnerId!.Value,
            collection.Id,
            new ReorderCollectionItemsDto { MediaIds = [first.Id, Guid.NewGuid()] }));

        var reordered = await service.ReorderItemsAsync(
            collection.OwnerId!.Value,
            collection.Id,
            new ReorderCollectionItemsDto { MediaIds = [second.Id, first.Id] });

        Assert.Equal(CollectionSortMode.Manual, reordered.SortMode);
        Assert.Equal(second.Id, reordered.Items[0].MediaId);
        Assert.Equal(1, reordered.Items[0].OrderIndex);
        Assert.Equal(first.Id, reordered.Items[1].MediaId);
        Assert.Equal(2, reordered.Items[1].OrderIndex);
    }

    [Fact]
    public async Task UpdateAsync_PreventsHierarchyCycles()
    {
        await using var db = await SeedUserCollectionAsync();
        var data = new TestDataFactory(db.Context);
        var owner = await db.Context.Users.SingleAsync();
        var parent = await db.Context.Collections.SingleAsync();
        var child = data.Collections.UserCollection(owner, "Child", parent);
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAsync(
            parent.OwnerId!.Value,
            parent.Id,
            new UpdateCollectionDto { ParentCollectionId = parent.Id }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateAsync(
            parent.OwnerId!.Value,
            parent.Id,
            new UpdateCollectionDto { ParentCollectionId = child.Id }));
    }

    [Fact]
    public async Task GetAndQuery_DoNotLeakPrivateCollections()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("private-owner"));
        var outsider = data.Users.Add(data.Users.Normal("private-outsider"));
        var collection = data.Collections.UserCollection(owner, "Private Collection");
        collection.Visibility = CollectionVisibility.Private;
        await data.SaveAsync();
        var service = CreateService(db);

        Assert.Null(await service.GetByIdAsync(collection.Id));
        Assert.Null(await service.GetByIdAsync(collection.Id, outsider.Id));
        Assert.NotNull(await service.GetByIdAsync(collection.Id, owner.Id));

        var anonymousQuery = await service.QueryAsync(new CollectionQueryDto(), null);
        var ownerQuery = await service.QueryAsync(new CollectionQueryDto(), owner.Id);

        Assert.DoesNotContain(anonymousQuery.Items, c => c.Id == collection.Id);
        Assert.Contains(ownerQuery.Items, c => c.Id == collection.Id);
    }

    [Fact]
    public async Task FollowedCollection_VisibleToFollower()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("followers-owner"));
        var follower = data.Users.Add(data.Users.Normal("collection-follower"));
        var collection = data.Collections.UserCollection(owner, "Followers Collection");
        collection.Visibility = CollectionVisibility.Followers;
        data.Collections.Follow(follower, collection);
        await data.SaveAsync();
        var service = CreateService(db);

        Assert.NotNull(await service.GetByIdAsync(collection.Id, follower.Id));

        var result = await service.QueryAsync(new CollectionQueryDto(), follower.Id);
        Assert.Contains(result.Items, c => c.Id == collection.Id);
    }

    [Fact]
    public async Task QueryAsync_NormalizesPagination()
    {
        await using var db = await SeedUserCollectionAsync();
        var service = CreateService(db);

        var result = await service.QueryAsync(new CollectionQueryDto { Page = 0, PageSize = 500 });

        Assert.Equal(1, result.Page);
        Assert.Equal(100, result.PageSize);
    }

    private static CollectionService CreateService(SqliteTestDb db) => new(db.Context);

    private static async Task<SqliteTestDb> SeedUserCollectionAsync()
    {
        var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var owner = data.Users.Add(data.Users.Normal("collection-owner"));
        data.Collections.UserCollection(owner);
        await data.SaveAsync();
        return db;
    }
}
