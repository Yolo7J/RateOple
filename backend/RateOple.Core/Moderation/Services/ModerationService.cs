using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Interfaces;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Moderation.Services;

public class ModerationService : IModerationService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly IModerationAuditService _auditService;
    private readonly IModerationRealtimePublisher _realtimePublisher;

    public ModerationService(
        ApplicationDbContext context,
        INotificationService notificationService,
        IModerationAuditService auditService,
        IModerationRealtimePublisher realtimePublisher)
    {
        _context = context;
        _notificationService = notificationService;
        _auditService = auditService;
        _realtimePublisher = realtimePublisher;
    }

    public async Task<ReportDto> CreateReportAsync(Guid reporterId, CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Reason is required.");
        if (dto.TargetId == Guid.Empty)
            throw new ArgumentException("Report target is required.");
        if (!Enum.IsDefined(dto.TargetType))
            throw new ArgumentException("Report target type is invalid.");

        var targetExists = await CheckTargetExistsAsync(dto.TargetType, dto.TargetId);
        if (!targetExists)
            throw new KeyNotFoundException("Report target not found.");

        var existing = await _context.Reports
            .FirstOrDefaultAsync(r =>
                r.ReporterId == reporterId &&
                r.TargetType == dto.TargetType &&
                r.TargetId == dto.TargetId);

        if (existing != null)
            return await MapReportAsync(existing);

        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = reporterId,
            TargetType = dto.TargetType,
            TargetId = dto.TargetId,
            Reason = dto.Reason.Trim(),
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reports.Add(report);
        await _context.SaveChangesAsync();
        return await MapReportAsync(report);
    }

    public async Task<PagedReportsDto> GetReportsAsync(ReportQueryDto query)
    {
        query ??= new ReportQueryDto();
        var pagination = Pagination.Normalize(query.Page, query.PageSize, defaultPageSize: 30);

        var q = _context.Reports.AsNoTracking().AsQueryable();
        if (query.Status.HasValue)
            q = q.Where(r => r.Status == query.Status.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToListAsync();

        var mappedItems = await MapReportsAsync(items);

        return new PagedReportsDto
        {
            Items = mappedItems,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task<ReportDto> UpdateReportStatusAsync(Guid reviewerId, Guid reportId, UpdateReportStatusDto dto)
    {
        var report = await _context.Reports.FirstOrDefaultAsync(r => r.Id == reportId)
            ?? throw new KeyNotFoundException("Report not found.");

        report.Status = dto.Status;
        report.ReviewedById = reviewerId;
        report.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var action = dto.Status switch
        {
            ReportStatus.Pending => ModerationAuditAction.ReportMarkedPending,
            ReportStatus.InReview => ModerationAuditAction.ReportMarkedInReview,
            ReportStatus.Resolved => ModerationAuditAction.ReportResolved,
            ReportStatus.Rejected => ModerationAuditAction.ReportRejected,
            _ => ModerationAuditAction.ReportMarkedPending
        };

        await _auditService.LogAsync(action, reviewerId, report.Id);
        await _notificationService.CreateAsync(report.ReporterId, NotificationType.ReportStatusChanged, report.Id);

        var updatedReport = await MapReportAsync(report);
        await _realtimePublisher.ReportUpdatedAsync(updatedReport);

        return updatedReport;
    }

    public async Task<ModeratorAssignmentDto> AssignModeratorAsync(Guid assignedById, CreateModeratorAssignmentDto dto)
    {
        if (dto.ScopeType == ModeratorScopeType.Global && dto.ScopeId.HasValue)
            throw new ArgumentException("ScopeId must be null for global assignments.");
        if (dto.ScopeType != ModeratorScopeType.Global && !dto.ScopeId.HasValue)
            throw new ArgumentException("ScopeId is required for non-global assignments.");

        var normalizedScopeId = NormalizeScopeId(dto.ScopeType, dto.ScopeId);
        var targetUserId = await ResolveUserIdAsync(dto.UserId, dto.UserIdentifier);

        var userExists = await _context.Users.AnyAsync(u => u.Id == targetUserId);
        if (!userExists)
            throw new KeyNotFoundException("User not found.");

        await EnsureScopeExistsAsync(dto.ScopeType, normalizedScopeId);

        var assignment = await _context.ModeratorAssignments
            .FirstOrDefaultAsync(x =>
                x.UserId == targetUserId &&
                x.ScopeType == dto.ScopeType &&
                x.ScopeId == normalizedScopeId);

        if (assignment == null)
        {
            assignment = new ModeratorAssignment
            {
                UserId = targetUserId,
                ScopeType = dto.ScopeType,
                ScopeId = normalizedScopeId,
                AssignedAt = DateTime.UtcNow,
                AssignedById = assignedById
            };
            _context.ModeratorAssignments.Add(assignment);
            await _context.SaveChangesAsync();
            await _notificationService.CreateAsync(assignment.UserId, NotificationType.ModeratorAssignment, assignment.UserId);

            await _auditService.LogAsync(
                ModerationAuditAction.ModeratorAssigned,
                assignedById,
                assignment.UserId,
                assignment.ScopeType,
                assignment.ScopeId);

            var assignmentDto = await MapAssignmentAsync(assignment);
            await _realtimePublisher.AssignmentUpdatedAsync(new ModeratorAssignmentUpdateDto
            {
                Action = "Added",
                Assignment = assignmentDto,
                UserId = assignmentDto.UserId,
                ScopeType = assignmentDto.ScopeType,
                ScopeId = assignmentDto.ScopeId
            });
        }

        return await MapAssignmentAsync(assignment);
    }

    public async Task<IReadOnlyList<ModeratorAssignmentDto>> GetAssignmentsAsync(ModeratorScopeType? scopeType, Guid? scopeId)
    {
        var q = _context.ModeratorAssignments.AsNoTracking().AsQueryable();

        if (scopeType.HasValue)
            q = q.Where(x => x.ScopeType == scopeType.Value);
        if (scopeId.HasValue)
            q = q.Where(x => x.ScopeId == scopeId.Value);

        var items = await q
            .OrderByDescending(x => x.AssignedAt)
            .ToListAsync();

        return await MapAssignmentsAsync(items);
    }

    public async Task RemoveAssignmentAsync(Guid actorId, Guid userId, ModeratorScopeType scopeType, Guid? scopeId)
    {
        var normalizedScopeId = NormalizeScopeId(scopeType, scopeId);
        var assignment = await _context.ModeratorAssignments
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.ScopeType == scopeType &&
                x.ScopeId == normalizedScopeId);

        if (assignment == null)
            return;

        _context.ModeratorAssignments.Remove(assignment);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync(
            ModerationAuditAction.ModeratorUnassigned,
            actorId,
            assignment.UserId,
            assignment.ScopeType,
            assignment.ScopeId);

        await _realtimePublisher.AssignmentUpdatedAsync(new ModeratorAssignmentUpdateDto
        {
            Action = "Removed",
            UserId = assignment.UserId,
            ScopeType = assignment.ScopeType,
            ScopeId = assignment.ScopeId == Guid.Empty && assignment.ScopeType == ModeratorScopeType.Global
                ? null
                : assignment.ScopeId
        });
    }

    private async Task<bool> CheckTargetExistsAsync(ReportTargetType targetType, Guid targetId)
    {
        return targetType switch
        {
            ReportTargetType.User => await _context.Users.AnyAsync(x => x.Id == targetId),
            ReportTargetType.Comment => await _context.Comments.AnyAsync(x => x.Id == targetId),
            ReportTargetType.Post => await _context.GroupPosts.AnyAsync(x => x.Id == targetId),
            ReportTargetType.Review => await _context.Reviews.AnyAsync(x => x.Id == targetId),
            _ => false
        };
    }

    private async Task<ReportDto> MapReportAsync(Report report)
    {
        var list = await MapReportsAsync([report]);
        return list[0];
    }

    private async Task<List<ReportDto>> MapReportsAsync(List<Report> reports)
    {
        if (reports.Count == 0)
            return [];

        var reporterIds = reports.Select(r => r.ReporterId).ToHashSet();
        var userTargetIds = reports
            .Where(r => r.TargetType == ReportTargetType.User)
            .Select(r => r.TargetId)
            .ToList();

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

        var userIds = new HashSet<Guid>(reporterIds);
        foreach (var id in userTargetIds) userIds.Add(id);
        foreach (var comment in commentInfos.Where(c => c.UserId.HasValue)) userIds.Add(comment.UserId!.Value);
        foreach (var post in postInfos.Where(p => p.UserId.HasValue)) userIds.Add(post.UserId!.Value);
        foreach (var review in reviewInfos) userIds.Add(review.UserId);

        var userDisplayNames = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                DisplayName = u.Profile != null ? u.Profile.DisplayName : u.UserName
            })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var commentMap = commentInfos.ToDictionary(c => c.Id, c => (c.Content, c.UserId));
        var postMap = postInfos.ToDictionary(p => p.Id, p => (p.Title, p.UserId));
        var reviewMap = reviewInfos.ToDictionary(r => r.Id, r => (r.Content, r.UserId));

        return reports.Select(report =>
        {
            var reporterName = userDisplayNames.GetValueOrDefault(report.ReporterId) ?? "Unknown user";
            var targetDisplay = report.TargetType switch
            {
                ReportTargetType.User => userDisplayNames.GetValueOrDefault(report.TargetId) ?? "Unknown user",
                ReportTargetType.Comment => BuildCommentDisplay(report.TargetId, commentMap, userDisplayNames),
                ReportTargetType.Post => BuildPostDisplay(report.TargetId, postMap, userDisplayNames),
                ReportTargetType.Review => BuildReviewDisplay(report.TargetId, reviewMap, userDisplayNames),
                _ => "Unknown target"
            };

            return new ReportDto
            {
                Id = report.Id,
                ReporterId = report.ReporterId,
                ReporterDisplayName = reporterName,
                TargetType = report.TargetType,
                TargetId = report.TargetId,
                TargetDisplayName = targetDisplay,
                Reason = report.Reason,
                Status = report.Status,
                CreatedAt = report.CreatedAt,
                UpdatedAt = report.UpdatedAt,
                ReviewedById = report.ReviewedById
            };
        }).ToList();
    }

    private async Task<ModeratorAssignmentDto> MapAssignmentAsync(ModeratorAssignment assignment)
    {
        var list = await MapAssignmentsAsync([assignment]);
        return list[0];
    }

    private async Task<List<ModeratorAssignmentDto>> MapAssignmentsAsync(List<ModeratorAssignment> assignments)
    {
        if (assignments.Count == 0)
            return [];

        var userIds = assignments
            .Select(a => a.UserId)
            .Concat(assignments.Select(a => a.AssignedById))
            .ToHashSet();

        var userDisplayNames = await _context.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                DisplayName = u.Profile != null ? u.Profile.DisplayName : u.UserName
            })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var scopeNames = await ResolveScopeNamesAsync(assignments
            .Where(a => a.ScopeId.HasValue || a.ScopeType == ModeratorScopeType.Global)
            .Select(a => (a.ScopeType, a.ScopeId))
            .ToList());

        return assignments.Select(assignment =>
        {
            var scopeKey = BuildScopeKey(assignment.ScopeType, assignment.ScopeId);
            var scopeName = scopeNames.GetValueOrDefault(scopeKey);
            if (assignment.ScopeType == ModeratorScopeType.Global)
                scopeName ??= "Global";

            return new ModeratorAssignmentDto
            {
                UserId = assignment.UserId,
                UserDisplayName = userDisplayNames.GetValueOrDefault(assignment.UserId) ?? "Unknown user",
                ScopeType = assignment.ScopeType,
                ScopeId = assignment.ScopeType == ModeratorScopeType.Global && assignment.ScopeId == Guid.Empty
                    ? null
                    : assignment.ScopeId,
                ScopeName = scopeName,
                AssignedAt = assignment.AssignedAt,
                AssignedById = assignment.AssignedById,
                AssignedByDisplayName = userDisplayNames.GetValueOrDefault(assignment.AssignedById) ?? "Unknown user"
            };
        }).ToList();
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

    private static string BuildScopeKey(ModeratorScopeType scopeType, Guid? scopeId)
    {
        return $"{(int)scopeType}:{scopeId?.ToString() ?? "null"}";
    }

    private async Task<Dictionary<string, string>> ResolveScopeNamesAsync(
        List<(ModeratorScopeType ScopeType, Guid? ScopeId)> scopes)
    {
        var result = new Dictionary<string, string>();
        var groupIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Group && s.ScopeId.HasValue)
            .Select(s => s.ScopeId!.Value)
            .Distinct()
            .ToList();
        var collectionIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Collection && s.ScopeId.HasValue)
            .Select(s => s.ScopeId!.Value)
            .Distinct()
            .ToList();
        var mediaIds = scopes
            .Where(s => s.ScopeType == ModeratorScopeType.Media && s.ScopeId.HasValue)
            .Select(s => s.ScopeId!.Value)
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

    private static Guid NormalizeScopeId(ModeratorScopeType scopeType, Guid? scopeId)
    {
        if (scopeType == ModeratorScopeType.Global)
        {
            return Guid.Empty;
        }

        return scopeId ?? throw new ArgumentException("ScopeId is required for non-global assignments.");
    }

    private async Task EnsureScopeExistsAsync(ModeratorScopeType scopeType, Guid scopeId)
    {
        var exists = scopeType switch
        {
            ModeratorScopeType.Global => true,
            ModeratorScopeType.Group => await _context.Groups.AnyAsync(g => g.Id == scopeId),
            ModeratorScopeType.Collection => await _context.Collections.AnyAsync(c => c.Id == scopeId),
            ModeratorScopeType.Media => await _context.Media.AnyAsync(m => m.Id == scopeId && !m.IsDeleted),
            _ => throw new ArgumentException("Moderator scope type is invalid.")
        };

        if (!exists)
            throw new KeyNotFoundException("Moderator assignment scope not found.");
    }

    private async Task<Guid> ResolveUserIdAsync(Guid userId, string? userIdentifier)
    {
        if (userId != Guid.Empty)
            return userId;

        if (string.IsNullOrWhiteSpace(userIdentifier))
            throw new ArgumentException("User identifier is required.");

        var normalized = userIdentifier.Trim();
        if (Guid.TryParse(normalized, out var parsedId))
            return parsedId;

        var normalizedUpper = normalized.ToUpperInvariant();
        var resolvedId = await _context.Users
            .AsNoTracking()
            .Where(u =>
                u.NormalizedUserName == normalizedUpper ||
                u.NormalizedEmail == normalizedUpper ||
                u.UserName == normalized ||
                u.Email == normalized)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();

        if (resolvedId == Guid.Empty)
            throw new KeyNotFoundException("User not found.");

        return resolvedId;
    }
}
