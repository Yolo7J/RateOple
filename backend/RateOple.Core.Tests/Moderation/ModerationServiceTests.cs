using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Moderation;

public class ModerationServiceTests
{
    [Fact]
    public async Task CreateReportAsync_CreatesReportAndDuplicateIsIdempotent()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        var target = data.Users.Add(data.Users.Normal("reported-user"));
        await data.SaveAsync();
        var service = CreateService(db);

        var first = await service.CreateReportAsync(reporter.Id, new CreateReportDto
        {
            TargetType = ReportTargetType.User,
            TargetId = target.Id,
            Reason = " abuse "
        });
        var second = await service.CreateReportAsync(reporter.Id, new CreateReportDto
        {
            TargetType = ReportTargetType.User,
            TargetId = target.Id,
            Reason = "duplicate"
        });

        Assert.Equal(first.Id, second.Id);
        Assert.Equal("abuse", first.Reason);
        Assert.Equal(ReportStatus.Pending, first.Status);
        Assert.Equal(1, await db.Context.Reports.CountAsync());
    }

    [Fact]
    public async Task CreateReportAsync_RejectsInvalidTarget()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateReportAsync(reporter.Id, new CreateReportDto
        {
            TargetType = ReportTargetType.User,
            TargetId = Guid.Empty,
            Reason = "bad"
        }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateReportAsync(reporter.Id, new CreateReportDto
        {
            TargetType = (ReportTargetType)999,
            TargetId = Guid.NewGuid(),
            Reason = "bad"
        }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateReportAsync(reporter.Id, new CreateReportDto
        {
            TargetType = ReportTargetType.User,
            TargetId = Guid.NewGuid(),
            Reason = "missing"
        }));
    }

    [Fact]
    public async Task UpdateReportStatusAsync_ChangesStatusWritesAuditAndNotification()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        var reviewer = data.Users.Add(data.Users.Moderator("reviewer"));
        var target = data.Users.Add(data.Users.Normal("target"));
        var report = data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        await data.SaveAsync();
        var notifications = new NoopNotificationService();
        var service = CreateService(db, notifications);

        var updated = await service.UpdateReportStatusAsync(reviewer.Id, report.Id, new UpdateReportStatusDto
        {
            Status = ReportStatus.Resolved
        });

        Assert.Equal(ReportStatus.Resolved, updated.Status);
        Assert.Equal(reviewer.Id, updated.ReviewedById);
        var audit = await db.Context.ModerationAuditLogs.SingleAsync();
        Assert.Equal(ModerationAuditAction.ReportResolved, audit.Action);
        Assert.Equal(reviewer.Id, audit.PerformedById);
        Assert.Equal(report.Id, audit.TargetId);
        Assert.Single(notifications.Created);
        Assert.Equal(NotificationType.ReportStatusChanged, notifications.Created[0].Type);
    }

    [Fact]
    public async Task AssignModeratorAsync_CreatesGlobalAssignmentAndDuplicateIsIdempotent()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("moderator"));
        await data.SaveAsync();
        var service = CreateService(db);

        var first = await service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Global
        });
        var second = await service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Global
        });

        Assert.Equal(first.UserId, second.UserId);
        Assert.Equal(ModeratorScopeType.Global, first.ScopeType);
        Assert.Null(first.ScopeId);
        Assert.Equal(1, await db.Context.ModeratorAssignments.CountAsync());
        Assert.Equal(1, await db.Context.ModerationAuditLogs.CountAsync());
    }

    [Fact]
    public async Task AssignModeratorAsync_ValidatesScopeAndUser()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("moderator"));
        await data.SaveAsync();
        var service = CreateService(db);

        await Assert.ThrowsAsync<ArgumentException>(() => service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Global,
            ScopeId = Guid.NewGuid()
        }));

        await Assert.ThrowsAsync<ArgumentException>(() => service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Group
        }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = Guid.NewGuid(),
            ScopeType = ModeratorScopeType.Global
        }));

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Group,
            ScopeId = Guid.NewGuid()
        }));
    }

    [Fact]
    public async Task AssignModeratorAsync_AllowsValidGroupCollectionAndMediaScopes()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("scoped-mod"));
        var owner = data.Users.Add(data.Users.Normal("owner"));
        var group = data.Groups.Group(owner, "Scoped Group");
        var collection = data.Collections.UserCollection(owner, "Scoped Collection");
        var media = data.Media.Movie("Scoped Movie");
        await data.SaveAsync();
        var service = CreateService(db);

        var groupAssignment = await service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Group,
            ScopeId = group.Id
        });
        var collectionAssignment = await service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Collection,
            ScopeId = collection.Id
        });
        var mediaAssignment = await service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Media,
            ScopeId = media.Id
        });

        Assert.Equal(group.Id, groupAssignment.ScopeId);
        Assert.Equal(collection.Id, collectionAssignment.ScopeId);
        Assert.Equal(media.Id, mediaAssignment.ScopeId);
        Assert.Equal(3, await db.Context.ModeratorAssignments.CountAsync());
    }

    [Fact]
    public async Task RemoveAssignmentAsync_DeletesAssignmentAndWritesAudit()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("moderator"));
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Global);
        await data.SaveAsync();
        var service = CreateService(db);

        await service.RemoveAssignmentAsync(admin.Id, moderator.Id, ModeratorScopeType.Global, null);

        Assert.Empty(db.Context.ModeratorAssignments);
        var audit = await db.Context.ModerationAuditLogs.SingleAsync();
        Assert.Equal(ModerationAuditAction.ModeratorUnassigned, audit.Action);
        Assert.Equal(admin.Id, audit.PerformedById);
        Assert.Equal(moderator.Id, audit.TargetId);
    }

    [Fact]
    public async Task AuditService_GetLogsAsync_FiltersAndPaginates()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var actor = data.Users.Add(data.Users.Admin("audit-admin"));
        var target = data.Users.Add(data.Users.Moderator("audit-target"));
        data.Moderation.AuditLog(actor, ModerationAuditAction.ModeratorAssigned, target.Id);
        data.Moderation.AuditLog(actor, ModerationAuditAction.ModeratorUnassigned, target.Id);
        await data.SaveAsync();
        var auditService = new ModerationAuditService(db.Context);

        var result = await auditService.GetLogsAsync(new ModerationAuditLogQueryDto
        {
            Action = ModerationAuditAction.ModeratorAssigned,
            Page = 0,
            PageSize = 500
        });

        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(100, result.PageSize);
        Assert.Single(result.Items);
        Assert.Equal(actor.Id, result.Items[0].PerformedById);
        Assert.Equal(target.Id, result.Items[0].TargetId);
    }

    private static ModerationService CreateService(SqliteTestDb db, NoopNotificationService? notifications = null)
    {
        return new ModerationService(
            db.Context,
            notifications ?? new NoopNotificationService(),
            new ModerationAuditService(db.Context),
            new NoopModerationRealtimePublisher());
    }
}
