using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Interfaces;
using RateOple.Core.Moderation.Services;
using RateOple.Core.Tests.TestSupport;

namespace RateOple.Core.Tests.Moderation;

public class ModerationTransactionTests
{
    [Fact]
    public async Task UpdateReportStatusAsync_WhenAuditFails_RollsBackReportStatus()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (reviewer, report) = await SeedReportAsync(db);
        var audit = new ThrowingModerationAuditService();
        var service = CreateService(db, auditService: audit);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateReportStatusAsync(reviewer.Id, report.Id, new UpdateReportStatusDto
        {
            Status = ReportStatus.Resolved
        }));

        Assert.Equal(ThrowingModerationAuditService.LogFailureMessage, ex.Message);
        Assert.Equal(1, audit.LogCalls);
        db.Context.ChangeTracker.Clear();
        var persisted = await db.Context.Reports.SingleAsync(r => r.Id == report.Id);
        Assert.Equal(ReportStatus.Pending, persisted.Status);
        Assert.Null(persisted.ReviewedById);
        Assert.Null(persisted.UpdatedAt);
        Assert.Empty(await db.Context.ModerationAuditLogs.ToListAsync());
        Assert.Empty(await db.Context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task UpdateReportStatusAsync_WhenNotificationFails_RollsBackReportStatusAndAuditLog()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var (reviewer, report) = await SeedReportAsync(db);
        var notification = new ThrowingNotificationService();
        var service = CreateService(db, notificationService: notification, auditService: new ModerationAuditService(db.Context));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.UpdateReportStatusAsync(reviewer.Id, report.Id, new UpdateReportStatusDto
        {
            Status = ReportStatus.Rejected
        }));

        Assert.Equal(ThrowingNotificationService.CreateFailureMessage, ex.Message);
        Assert.Equal(1, notification.CreateCalls);
        db.Context.ChangeTracker.Clear();
        var persisted = await db.Context.Reports.SingleAsync(r => r.Id == report.Id);
        Assert.Equal(ReportStatus.Pending, persisted.Status);
        Assert.Null(persisted.ReviewedById);
        Assert.Empty(await db.Context.ModerationAuditLogs.ToListAsync());
        Assert.Empty(await db.Context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task AssignModeratorAsync_WhenNotificationFails_RollsBackAssignment()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("assignment-admin"));
        var moderator = data.Users.Add(data.Users.Moderator("assignment-moderator"));
        await data.SaveAsync();
        var notification = new ThrowingNotificationService();
        var service = CreateService(db, notificationService: notification, auditService: new ModerationAuditService(db.Context));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.AssignModeratorAsync(admin.Id, new CreateModeratorAssignmentDto
        {
            UserId = moderator.Id,
            ScopeType = ModeratorScopeType.Global
        }));

        Assert.Equal(ThrowingNotificationService.CreateFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Empty(await db.Context.ModeratorAssignments.ToListAsync());
        Assert.Empty(await db.Context.ModerationAuditLogs.ToListAsync());
        Assert.Empty(await db.Context.Notifications.ToListAsync());
    }

    [Fact]
    public async Task RemoveAssignmentAsync_WhenAuditFails_RollsBackAssignmentRemoval()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("remove-assignment-admin"));
        var moderator = data.Users.Add(data.Users.Moderator("remove-assignment-moderator"));
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Global);
        await data.SaveAsync();
        var audit = new ThrowingModerationAuditService();
        var service = CreateService(db, auditService: audit);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.RemoveAssignmentAsync(admin.Id, moderator.Id, ModeratorScopeType.Global, null));

        Assert.Equal(ThrowingModerationAuditService.LogFailureMessage, ex.Message);
        db.Context.ChangeTracker.Clear();
        Assert.Single(await db.Context.ModeratorAssignments.ToListAsync());
        Assert.Empty(await db.Context.ModerationAuditLogs.ToListAsync());
    }

    private static async Task<(RateOple.Infrastructure.Data.Entities.User Reviewer, RateOple.Infrastructure.Data.Entities.Report Report)> SeedReportAsync(
        SqliteTestDb db)
    {
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("moderation-transaction-reporter"));
        var reviewer = data.Users.Add(data.Users.Moderator("moderation-transaction-reviewer"));
        var target = data.Users.Add(data.Users.Normal("moderation-transaction-target"));
        var report = data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        await data.SaveAsync();
        return (reviewer, report);
    }

    private static ModerationService CreateService(
        SqliteTestDb db,
        INotificationService? notificationService = null,
        IModerationAuditService? auditService = null,
        IModerationRealtimePublisher? realtimePublisher = null) => new(
            db.Context,
            notificationService ?? new NoopNotificationService(),
            auditService ?? new ModerationAuditService(db.Context),
            realtimePublisher ?? new NoopModerationRealtimePublisher());
}
