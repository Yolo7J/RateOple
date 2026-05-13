using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Moderation.Services;

public class ModerationAuditService : IModerationAuditService
{
    private readonly ApplicationDbContext _context;

    public ModerationAuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        ModerationAuditAction action,
        Guid performedById,
        Guid targetId,
        ModeratorScopeType? scopeType = null,
        Guid? scopeId = null,
        string? notes = null)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == performedById);
        if (!userExists)
            throw new KeyNotFoundException("Audit performer not found.");

        var log = new ModerationAuditLog
        {
            Id = Guid.NewGuid(),
            Action = action,
            PerformedById = performedById,
            TargetId = targetId,
            ScopeType = scopeType,
            ScopeId = scopeId,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ModerationAuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task<PagedModerationAuditLogsDto> GetLogsAsync(ModerationAuditLogQueryDto query)
    {
        query ??= new ModerationAuditLogQueryDto();
        var pagination = Pagination.Normalize(query.Page, query.PageSize, defaultPageSize: 30);

        var q = _context.ModerationAuditLogs.AsNoTracking().AsQueryable();
        if (query.Action.HasValue)
            q = q.Where(l => l.Action == query.Action.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToListAsync();

        var mappedItems = await MapLogsAsync(items);

        return new PagedModerationAuditLogsDto
        {
            Items = mappedItems,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    private async Task<List<ModerationAuditLogDto>> MapLogsAsync(List<ModerationAuditLog> logs)
    {
        if (logs.Count == 0)
            return [];

        var performedByIds = logs.Select(l => l.PerformedById).ToHashSet();
        var targetUserIds = logs
            .Where(l => l.Action is ModerationAuditAction.ModeratorAssigned
                        or ModerationAuditAction.ModeratorUnassigned
                        or ModerationAuditAction.GlobalRoleGranted
                        or ModerationAuditAction.GlobalRoleRevoked
                        or ModerationAuditAction.GroupUserBanned
                        or ModerationAuditAction.GroupUserUnbanned)
            .Select(l => l.TargetId)
            .ToList();

        var reportIds = logs
            .Where(l => l.Action is ModerationAuditAction.ReportMarkedPending
                        or ModerationAuditAction.ReportMarkedInReview
                        or ModerationAuditAction.ReportResolved
                        or ModerationAuditAction.ReportRejected)
            .Select(l => l.TargetId)
            .ToList();

        var userIds = new HashSet<Guid>(performedByIds);
        foreach (var id in targetUserIds) userIds.Add(id);

        var userDisplayNames = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                DisplayName = u.Profile != null ? u.Profile.DisplayName : u.UserName
            })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var reportDisplayNames = await ResolveReportDisplayNamesAsync(reportIds, userDisplayNames);
        var scopeNames = await ResolveScopeNamesAsync(logs);

        return logs.Select(log =>
        {
            var targetDisplay = log.Action switch
            {
                ModerationAuditAction.ReportMarkedPending or
                ModerationAuditAction.ReportMarkedInReview or
                ModerationAuditAction.ReportResolved or
                ModerationAuditAction.ReportRejected =>
                    reportDisplayNames.GetValueOrDefault(log.TargetId) ?? "Report",
                ModerationAuditAction.ModeratorAssigned or
                ModerationAuditAction.ModeratorUnassigned or
                ModerationAuditAction.GlobalRoleGranted or
                ModerationAuditAction.GlobalRoleRevoked or
                ModerationAuditAction.GroupUserBanned or
                ModerationAuditAction.GroupUserUnbanned =>
                    userDisplayNames.GetValueOrDefault(log.TargetId) ?? "Unknown user",
                _ => "—"
            };

            var scopeKey = BuildScopeKey(log.ScopeType, log.ScopeId);
            var scopeName = scopeNames.GetValueOrDefault(scopeKey);

            return new ModerationAuditLogDto
            {
                Id = log.Id,
                Action = log.Action,
                PerformedById = log.PerformedById,
                PerformedByDisplayName = userDisplayNames.GetValueOrDefault(log.PerformedById) ?? "Unknown user",
                TargetId = log.TargetId,
                TargetDisplayName = targetDisplay,
                ScopeType = log.ScopeType,
                ScopeId = log.ScopeType == ModeratorScopeType.Global && log.ScopeId == Guid.Empty
                    ? null
                    : log.ScopeId,
                ScopeName = scopeName,
                Notes = log.Notes,
                CreatedAt = log.CreatedAt
            };
        }).ToList();
    }

    private async Task<Dictionary<Guid, string>> ResolveReportDisplayNamesAsync(
        List<Guid> reportIds,
        Dictionary<Guid, string?> userDisplayNames)
    {
        if (reportIds.Count == 0)
            return new Dictionary<Guid, string>();

        var reports = await _context.Reports
            .AsNoTracking()
            .Where(r => reportIds.Contains(r.Id))
            .ToListAsync();

        var commentIds = reports
            .Where(r => r.TargetType == ReportTargetType.Comment)
            .Select(r => r.TargetId)
            .ToList();
        var postIds = reports
            .Where(r => r.TargetType == ReportTargetType.Post)
            .Select(r => r.TargetId)
            .ToList();
        var reviewIds = reports
            .Where(r => r.TargetType == ReportTargetType.Review)
            .Select(r => r.TargetId)
            .ToList();
        var userTargetIds = reports
            .Where(r => r.TargetType == ReportTargetType.User)
            .Select(r => r.TargetId)
            .ToList();

        var commentInfos = await _context.Comments
            .AsNoTracking()
            .Where(c => commentIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Content, c.UserId })
            .ToListAsync();

        var postInfos = await _context.GroupPosts
            .AsNoTracking()
            .Where(p => postIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Title, p.UserId })
            .ToListAsync();

        var reviewInfos = await _context.Reviews
            .AsNoTracking()
            .Where(r => reviewIds.Contains(r.Id))
            .Select(r => new { r.Id, r.Content, r.UserId })
            .ToListAsync();

        var extraUserIds = new HashSet<Guid>();
        foreach (var id in userTargetIds) extraUserIds.Add(id);
        foreach (var comment in commentInfos.Where(c => c.UserId.HasValue)) extraUserIds.Add(comment.UserId!.Value);
        foreach (var post in postInfos.Where(p => p.UserId.HasValue)) extraUserIds.Add(post.UserId!.Value);
        foreach (var review in reviewInfos) extraUserIds.Add(review.UserId);

        if (extraUserIds.Count > 0)
        {
            var missingUsers = await _context.Users
                .AsNoTracking()
                .Where(u => extraUserIds.Contains(u.Id))
                .Select(u => new
                {
                    u.Id,
                    DisplayName = u.Profile != null ? u.Profile.DisplayName : u.UserName
                })
                .ToListAsync();

            foreach (var user in missingUsers)
                userDisplayNames[user.Id] = user.DisplayName;
        }

        var commentMap = commentInfos.ToDictionary(c => c.Id, c => (c.Content, c.UserId));
        var postMap = postInfos.ToDictionary(p => p.Id, p => (p.Title, p.UserId));
        var reviewMap = reviewInfos.ToDictionary(r => r.Id, r => (r.Content, r.UserId));

        var result = new Dictionary<Guid, string>();
        foreach (var report in reports)
        {
            var targetDisplay = report.TargetType switch
            {
                ReportTargetType.User => userDisplayNames.GetValueOrDefault(report.TargetId) ?? "Unknown user",
                ReportTargetType.Comment => BuildCommentDisplay(report.TargetId, commentMap, userDisplayNames),
                ReportTargetType.Post => BuildPostDisplay(report.TargetId, postMap, userDisplayNames),
                ReportTargetType.Review => BuildReviewDisplay(report.TargetId, reviewMap, userDisplayNames),
                _ => "Unknown target"
            };

            result[report.Id] = $"Report on {targetDisplay}";
        }

        return result;
    }

    private static string BuildCommentDisplay(
        Guid commentId,
        Dictionary<Guid, (string Content, Guid? UserId)> comments,
        Dictionary<Guid, string?> userNames)
    {
        if (!comments.TryGetValue(commentId, out var comment))
            return "Comment (deleted)";

        var author = comment.UserId.HasValue && userNames.TryGetValue(comment.UserId.Value, out var name)
            ? name
            : "Unknown user";

        return $"Comment by {author}: \"{TrimSnippet(comment.Content)}\"";
    }

    private static string BuildPostDisplay(
        Guid postId,
        Dictionary<Guid, (string Title, Guid? UserId)> posts,
        Dictionary<Guid, string?> userNames)
    {
        if (!posts.TryGetValue(postId, out var post))
            return "Post (deleted)";

        var author = post.UserId.HasValue && userNames.TryGetValue(post.UserId.Value, out var name)
            ? name
            : "Unknown user";

        return $"Post by {author}: {TrimSnippet(post.Title)}";
    }

    private static string BuildReviewDisplay(
        Guid reviewId,
        Dictionary<Guid, (string Content, Guid UserId)> reviews,
        Dictionary<Guid, string?> userNames)
    {
        if (!reviews.TryGetValue(reviewId, out var review))
            return "Review (deleted)";

        var author = userNames.TryGetValue(review.UserId, out var name) ? name : "Unknown user";
        return $"Review by {author}: \"{TrimSnippet(review.Content)}\"";
    }

    private static string TrimSnippet(string? value, int maxLength = 60)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "—";

        var normalized = value.Trim();
        return normalized.Length <= maxLength ? normalized : $"{normalized[..maxLength]}…";
    }

    private static string BuildScopeKey(ModeratorScopeType? scopeType, Guid? scopeId)
    {
        var typeKey = scopeType?.ToString() ?? "none";
        return $"{typeKey}:{scopeId?.ToString() ?? "null"}";
    }

    private async Task<Dictionary<string, string>> ResolveScopeNamesAsync(List<ModerationAuditLog> logs)
    {
        var result = new Dictionary<string, string>();
        var scopes = logs
            .Where(l => l.ScopeType.HasValue && l.ScopeId.HasValue)
            .Select(l => (ScopeType: l.ScopeType!.Value, ScopeId: l.ScopeId!.Value))
            .ToList();

        var groupIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Group)
            .Select(s => s.ScopeId)
            .Distinct()
            .ToList();
        var collectionIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Collection)
            .Select(s => s.ScopeId)
            .Distinct()
            .ToList();
        var mediaIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Media)
            .Select(s => s.ScopeId)
            .Distinct()
            .ToList();

        if (groupIds.Count > 0)
        {
            var groups = await _context.Groups
                .AsNoTracking()
                .Where(g => groupIds.Contains(g.Id))
                .Select(g => new { g.Id, g.Name })
                .ToListAsync();
            foreach (var group in groups)
                result[BuildScopeKey(ModeratorScopeType.Group, group.Id)] = group.Name;
        }

        if (collectionIds.Count > 0)
        {
            var collections = await _context.Collections
                .AsNoTracking()
                .Where(c => collectionIds.Contains(c.Id))
                .Select(c => new { c.Id, Name = c.Name ?? c.Title })
                .ToListAsync();
            foreach (var collection in collections)
                result[BuildScopeKey(ModeratorScopeType.Collection, collection.Id)] = collection.Name;
        }

        if (mediaIds.Count > 0)
        {
            var media = await _context.Media
                .AsNoTracking()
                .Where(m => mediaIds.Contains(m.Id))
                .Select(m => new { m.Id, m.Title })
                .ToListAsync();
            foreach (var item in media)
                result[BuildScopeKey(ModeratorScopeType.Media, item.Id)] = item.Title;
        }

        result[BuildScopeKey(ModeratorScopeType.Global, null)] = "Global";
        result[BuildScopeKey(ModeratorScopeType.Global, Guid.Empty)] = "Global";

        return result;
    }
}
