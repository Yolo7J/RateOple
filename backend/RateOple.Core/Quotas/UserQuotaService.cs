using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data;

namespace RateOple.Core.Quotas;

public sealed class UserQuotaService : IUserQuotaService
{
    private readonly ApplicationDbContext _context;
    private readonly UserQuotaOptions _options;

    public UserQuotaService(ApplicationDbContext context, IOptions<UserQuotaOptions> options)
    {
        _context = context;
        _options = options.Value;
    }

    public async Task EnsureCanCreateCollectionAsync(
        Guid userId,
        CollectionOwnerType ownerType,
        Guid? ownerId,
        Guid? parentCollectionId)
    {
        if (ownerType == CollectionOwnerType.User && (ownerId ?? userId) == userId)
        {
            var count = await _context.Collections.CountAsync(c =>
                c.OwnerType == CollectionOwnerType.User && c.OwnerId == userId);
            ThrowIfAtLimit(count, _options.CollectionsPerUser, "Collection limit reached.");
        }

        if (parentCollectionId.HasValue)
            await EnsureParentAllowsChildAsync(parentCollectionId.Value);
    }

    public async Task EnsureCanMoveCollectionAsync(Guid userId, Guid collectionId, Guid? parentCollectionId)
    {
        if (!parentCollectionId.HasValue)
            return;

        var currentParentId = await _context.Collections
            .Where(c => c.Id == collectionId)
            .Select(c => c.ParentCollectionId)
            .FirstOrDefaultAsync();

        if (currentParentId == parentCollectionId)
            return;

        await EnsureParentAllowsChildAsync(parentCollectionId.Value);

        var newParentDepth = await GetDepthAsync(parentCollectionId.Value);
        var subtreeDepth = await GetSubtreeDepthAsync(collectionId);
        if (newParentDepth + subtreeDepth > _options.CollectionNestingDepth)
            throw new QuotaExceededException("Collection nesting depth limit reached.");
    }

    public async Task EnsureCanAddCollectionItemAsync(Guid collectionId)
    {
        var count = await _context.CollectionItems.CountAsync(i => i.CollectionId == collectionId && !i.Media.IsDeleted);
        ThrowIfAtLimit(count, _options.CollectionItemsPerCollection, "Collection item limit reached.");
    }

    public async Task EnsureCanFollowCollectionAsync(Guid userId)
    {
        var count = await _context.FollowCollections.CountAsync(f => f.UserId == userId);
        ThrowIfAtLimit(count, _options.FollowedCollectionsPerUser, "Followed collection limit reached.");
    }

    public async Task EnsureCanCreateGroupAsync(Guid userId)
    {
        var count = await _context.Groups.CountAsync(g => g.OwnerId == userId);
        ThrowIfAtLimit(count, _options.GroupsOwnedPerUser, "Owned group limit reached.");
    }

    public async Task EnsureCanJoinGroupAsync(Guid userId)
    {
        var count = await _context.GroupMemberships.CountAsync(m => m.UserId == userId);
        ThrowIfAtLimit(count, _options.GroupMembershipsPerUser, "Group membership limit reached.");
    }

    public async Task EnsureCanCreateGroupPostAsync(Guid userId, Guid groupId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.GroupPosts.CountAsync(p =>
            p.UserId == userId && p.GroupId == groupId && p.CreatedAt > since);
        ThrowIfAtLimit(count, _options.PostsPerGroupPerUserPerDay, "Daily group post limit reached.", 429);
    }

    public async Task EnsureCanCreateCommentAsync(Guid userId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.Comments.CountAsync(c => c.UserId == userId && c.CreatedAt > since);
        ThrowIfAtLimit(count, _options.CommentsPerUserPerDay, "Daily comment limit reached.", 429);
    }

    public async Task EnsureCanCreateReviewAsync(Guid userId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.Reviews.CountAsync(r => r.UserId == userId && r.CreatedAt > since);
        ThrowIfAtLimit(count, _options.ReviewsPerUserPerDay, "Daily review limit reached.", 429);
    }

    public async Task EnsureCanCreateReportAsync(Guid userId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.Reports.CountAsync(r => r.ReporterId == userId && r.CreatedAt > since);
        ThrowIfAtLimit(count, _options.ReportsPerUserPerDay, "Daily report limit reached.", 429);
    }

    public async Task EnsureCanCreateRatingAsync(Guid userId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.Ratings.CountAsync(r => r.UserId == userId && r.CreatedAt > since);
        ThrowIfAtLimit(count, _options.RatingsPerUserPerDay, "Daily rating limit reached.", 429);
    }

    public async Task EnsureCanPinMediaAsync(Guid groupId)
    {
        var count = await _context.GroupMediaLinks.CountAsync(x => x.GroupId == groupId && !x.Media.IsDeleted);
        ThrowIfAtLimit(count, _options.PinnedMediaPerGroup, "Pinned media limit reached.");
    }

    public async Task EnsureCanCreateStaffMessageAsync(Guid groupId)
    {
        var since = DateTime.UtcNow.AddDays(-1);
        var count = await _context.GroupStaffMessages.CountAsync(m => m.GroupId == groupId && m.CreatedAt > since);
        ThrowIfAtLimit(count, _options.StaffMessagesPerGroupPerDay, "Daily staff message limit reached.", 429);
    }

    public async Task EnsureCanCreateSuspensionAppealAsync(Guid userId)
    {
        var hasPending = await _context.SuspensionAppeals
            .AnyAsync(a => a.UserId == userId && a.Status == SuspensionAppealStatus.Pending);
        if (hasPending)
            throw new QuotaExceededException("You already have a pending suspension appeal.", code: "pending_appeal_exists");

        var cutoff = DateTime.UtcNow.AddDays(-_options.SuspensionAppealRejectedCooldownDays);
        var rejectedTooRecently = await _context.SuspensionAppeals.AnyAsync(a =>
            a.UserId == userId &&
            a.Status == SuspensionAppealStatus.Rejected &&
            a.ResolvedAt != null &&
            a.ResolvedAt > cutoff);
        if (rejectedTooRecently)
            throw new QuotaExceededException(
                $"You can submit another appeal {_options.SuspensionAppealRejectedCooldownDays} days after the last rejected appeal.",
                429,
                "appeal_cooldown_active");

        var since = DateTime.UtcNow.AddDays(-1);
        var recentAttempts = await _context.SuspensionAppeals.CountAsync(a => a.UserId == userId && a.CreatedAt > since);
        ThrowIfAtLimit(
            recentAttempts,
            _options.SuspensionAppealsPerUserPerDay,
            "Suspension appeal attempt limit reached.",
            429);
    }

    private async Task EnsureParentAllowsChildAsync(Guid parentCollectionId)
    {
        var siblingCount = await _context.Collections.CountAsync(c => c.ParentCollectionId == parentCollectionId);
        ThrowIfAtLimit(siblingCount, _options.NestedCollectionsPerParent, "Nested collection limit reached.");

        var depth = await GetDepthAsync(parentCollectionId);
        if (depth + 1 > _options.CollectionNestingDepth)
            throw new QuotaExceededException("Collection nesting depth limit reached.");
    }

    private async Task<int> GetDepthAsync(Guid collectionId)
    {
        var depth = 1;
        var currentId = collectionId;
        while (true)
        {
            var parentId = await _context.Collections
                .AsNoTracking()
                .Where(c => c.Id == currentId)
                .Select(c => c.ParentCollectionId)
                .FirstOrDefaultAsync();

            if (!parentId.HasValue)
                return depth;

            depth++;
            currentId = parentId.Value;
        }
    }

    private async Task<int> GetSubtreeDepthAsync(Guid collectionId)
    {
        var childIds = await _context.Collections
            .AsNoTracking()
            .Where(c => c.ParentCollectionId == collectionId)
            .Select(c => c.Id)
            .ToListAsync();

        if (childIds.Count == 0)
            return 1;

        var maxChildDepth = 1;
        foreach (var childId in childIds)
            maxChildDepth = Math.Max(maxChildDepth, 1 + await GetSubtreeDepthAsync(childId));

        return maxChildDepth;
    }

    private static void ThrowIfAtLimit(int count, int limit, string message, int statusCode = 403)
    {
        if (limit >= 0 && count >= limit)
            throw new QuotaExceededException(message, statusCode);
    }
}
