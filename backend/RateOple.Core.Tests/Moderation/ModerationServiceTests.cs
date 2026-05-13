using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
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

        var updated = await service.UpdateReportStatusAsync(reviewer.Id, true, report.Id, new UpdateReportStatusDto
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
        var userManager = await TestUsers.CreateUserManagerAsync(db.Context);
        await data.SaveAsync();
        await userManager.AddToRoleAsync(moderator, RoleConstants.Moderator);
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
        var userManager = await TestUsers.CreateUserManagerAsync(db.Context);
        await data.SaveAsync();
        await userManager.AddToRoleAsync(moderator, RoleConstants.Moderator);
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
        var userManager = await TestUsers.CreateUserManagerAsync(db.Context);
        var owner = data.Users.Add(data.Users.Normal("owner"));
        var group = data.Groups.Group(owner, "Scoped Group");
        var collection = data.Collections.UserCollection(owner, "Scoped Collection");
        var media = data.Media.Movie("Scoped Movie");
        await data.SaveAsync();
        await userManager.AddToRoleAsync(moderator, RoleConstants.Moderator);
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
    public async Task GetReportsAsync_NoAssignmentModeratorGetsNoActionableQueueAndCannotUpdate()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        var moderator = data.Users.Add(data.Users.Moderator("unassigned-moderator"));
        var target = data.Users.Add(data.Users.Normal("target"));
        var report = data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        await data.SaveAsync();
        var service = CreateService(db);

        var result = await service.GetReportsAsync(moderator.Id, false, new ReportQueryDto());

        Assert.Empty(result.Items);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            report.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Resolved }));
    }

    [Fact]
    public async Task GetReportsAsync_GlobalAssignmentSeesAllReports()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("global-moderator"));
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        var target = data.Users.Add(data.Users.Normal("target"));
        data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        data.Moderation.Report(reporter, ReportTargetType.User, moderator.Id);
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Global);
        await data.SaveAsync();
        var service = CreateService(db);

        var result = await service.GetReportsAsync(moderator.Id, false, new ReportQueryDto());

        Assert.Equal(2, result.Items.Count);

        var updated = await service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            result.Items[0].Id,
            new UpdateReportStatusDto { Status = ReportStatus.Escalated, Note = "Needs admin review." });
        Assert.Equal(ReportStatus.Escalated, updated.Status);
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(log =>
            log.Action == ModerationAuditAction.ReportEscalatedToAdmin &&
            log.TargetId == updated.Id &&
            log.Notes == "Needs admin review."));
    }

    [Fact]
    public async Task GetReportsAsync_ScopedAssignmentsSeeOnlyMatchingReportTargets()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("admin"));
        var moderator = data.Users.Add(data.Users.Moderator("scoped-moderator"));
        var reporter = data.Users.Add(data.Users.Normal("reporter"));
        var owner = data.Users.Add(data.Users.Normal("owner"));
        var group = data.Groups.Group(owner, "Assigned Group");
        var otherGroup = data.Groups.Group(owner, "Other Group");
        var assignedPost = data.Groups.Post(group, owner, "Assigned Post");
        var otherPost = data.Groups.Post(otherGroup, owner, "Other Post");
        var assignedMedia = data.Media.Movie("Assigned Movie");
        var otherMedia = data.Media.Movie("Other Movie");
        var assignedRating = data.Reviews.RatingForMedia(owner, assignedMedia);
        var otherRating = data.Reviews.RatingForMedia(owner, otherMedia);
        var assignedReview = data.Reviews.Review(owner, assignedMedia, assignedRating, "Assigned review");
        var otherReview = data.Reviews.Review(owner, otherMedia, otherRating, "Other review");
        var groupReport = data.Moderation.Report(reporter, ReportTargetType.Post, assignedPost.Id);
        data.Moderation.Report(reporter, ReportTargetType.Post, otherPost.Id);
        var mediaReport = data.Moderation.Report(reporter, ReportTargetType.Review, assignedReview.Id);
        var otherMediaReport = data.Moderation.Report(reporter, ReportTargetType.Review, otherReview.Id);
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Group, group.Id);
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Media, assignedMedia.Id);
        await data.SaveAsync();
        var service = CreateService(db);

        var result = await service.GetReportsAsync(moderator.Id, false, new ReportQueryDto { PageSize = 20 });

        var ids = result.Items.Select(item => item.Id).ToHashSet();
        Assert.Equal(2, ids.Count);
        Assert.Contains(groupReport.Id, ids);
        Assert.Contains(mediaReport.Id, ids);

        var updated = await service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            groupReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.InReview });
        Assert.Equal(ReportStatus.InReview, updated.Status);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            otherMediaReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Resolved }));
    }

    [Fact]
    public async Task GetReportsAsync_MediaScopeSeesAndActionsOnlyMatchingMediaReports()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("media-admin"));
        var moderator = data.Users.Add(data.Users.Moderator("media-moderator"));
        var reporter = data.Users.Add(data.Users.Normal("media-reporter"));
        var author = data.Users.Add(data.Users.Normal("media-author"));
        var assignedMedia = data.Media.Movie("Assigned Movie");
        var otherMedia = data.Media.Movie("Other Movie");
        var assignedRating = data.Reviews.RatingForMedia(author, assignedMedia);
        var otherRating = data.Reviews.RatingForMedia(author, otherMedia);
        var assignedReview = data.Reviews.Review(author, assignedMedia, assignedRating, "Assigned review");
        var otherReview = data.Reviews.Review(author, otherMedia, otherRating, "Other review");
        var assignedReport = data.Moderation.Report(reporter, ReportTargetType.Review, assignedReview.Id);
        var otherReport = data.Moderation.Report(reporter, ReportTargetType.Review, otherReview.Id);
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Media, assignedMedia.Id);
        await data.SaveAsync();
        var service = CreateService(db);

        var result = await service.GetReportsAsync(moderator.Id, false, new ReportQueryDto());

        Assert.Single(result.Items);
        Assert.Equal(assignedReport.Id, result.Items[0].Id);

        await service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            assignedReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Resolved });

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.UpdateReportStatusAsync(
            moderator.Id,
            false,
            otherReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Resolved }));
    }

    [Fact]
    public async Task UpdateReportStatusAsync_AdminAndSuperAdminCanActionAllReports()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("staff-reporter"));
        var admin = data.Users.Add(data.Users.Admin("status-admin"));
        var superAdmin = data.Users.Add(data.Users.Admin("status-super-admin"));
        var target = data.Users.Add(data.Users.Normal("status-target"));
        var adminReport = data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        var superAdminReport = data.Moderation.Report(reporter, ReportTargetType.User, admin.Id);
        await data.SaveAsync();
        var service = CreateService(db);

        var adminUpdate = await service.UpdateReportStatusAsync(
            admin.Id,
            true,
            adminReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Resolved });
        var superAdminUpdate = await service.UpdateReportStatusAsync(
            superAdmin.Id,
            true,
            superAdminReport.Id,
            new UpdateReportStatusDto { Status = ReportStatus.Rejected });

        Assert.Equal(ReportStatus.Resolved, adminUpdate.Status);
        Assert.Equal(ReportStatus.Rejected, superAdminUpdate.Status);
    }

    [Fact]
    public async Task RemoveReportTargetAsync_RemovesLeafGroupCommentAndAudits()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var admin = data.Users.Add(data.Users.Admin("remove-admin"));
        var moderator = data.Users.Add(data.Users.Moderator("remove-moderator"));
        var reporter = data.Users.Add(data.Users.Normal("remove-reporter"));
        var owner = data.Users.Add(data.Users.Normal("remove-owner"));
        var author = data.Users.Add(data.Users.Normal("remove-author"));
        var group = data.Groups.Group(owner, "Removal Group");
        var post = data.Groups.Post(group, author, "Removal Post");
        var comment = data.GroupPostComment(author.Id, post.Id, "Reported comment");
        var report = data.Moderation.Report(reporter, ReportTargetType.Comment, comment.Id);
        data.Moderation.Assignment(moderator, admin, ModeratorScopeType.Group, group.Id);
        await data.SaveAsync();
        var notifications = new NoopNotificationService();
        var service = CreateService(db, notifications);

        var updated = await service.RemoveReportTargetAsync(
            moderator.Id,
            false,
            report.Id,
            new RemoveReportTargetDto { Reason = "Rule violation." });

        Assert.Equal(ReportStatus.Resolved, updated.Status);
        Assert.False(await db.Context.Comments.AnyAsync(c => c.Id == comment.Id));
        Assert.True(await db.Context.ModerationAuditLogs.AnyAsync(log =>
            log.Action == ModerationAuditAction.ReportTargetRemoved &&
            log.TargetId == report.Id &&
            log.ScopeType == ModeratorScopeType.Group &&
            log.ScopeId == group.Id &&
            log.Notes == "Rule violation."));
        Assert.Contains(notifications.Created, notification => notification.Type == NotificationType.CommentRemoved);
    }

    [Fact]
    public async Task RemoveReportTargetAsync_UnsupportedTargetThrowsWithoutAudit()
    {
        await using var db = await SqliteTestDb.CreateAsync();
        var data = new TestDataFactory(db.Context);
        var reporter = data.Users.Add(data.Users.Normal("unsupported-reporter"));
        var moderator = data.Users.Add(data.Users.Moderator("unsupported-moderator"));
        var target = data.Users.Add(data.Users.Normal("unsupported-target"));
        var report = data.Moderation.Report(reporter, ReportTargetType.User, target.Id);
        await data.SaveAsync();
        var service = CreateService(db);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.RemoveReportTargetAsync(
            moderator.Id,
            true,
            report.Id,
            new RemoveReportTargetDto()));

        Assert.Contains("not a moderation queue target action", ex.Message);
        Assert.False(await db.Context.ModerationAuditLogs.AnyAsync());
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
