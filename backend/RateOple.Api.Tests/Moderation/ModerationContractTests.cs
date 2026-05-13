using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Moderation;

public class ModerationContractTests
{
    [Fact]
    public async Task ModeratorWithoutAssignments_SeesEmptyQueueAndCannotActionByDirectApiCall()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var moderator = await factory.AddUserAsync("api-no-assignment-moderator", RoleConstants.Moderator);
        var reporter = await factory.AddUserAsync("api-no-assignment-reporter", RoleConstants.User);
        var target = await factory.AddUserAsync("api-no-assignment-target", RoleConstants.User);
        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = reporter.Id,
            TargetType = ReportTargetType.User,
            TargetId = target.Id,
            Reason = "No assignment test",
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        await factory.WithDbAsync(db =>
        {
            db.Reports.Add(report);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, moderator, RoleConstants.Moderator);

        using var queueRequest = AuthenticatedRequest(
            moderator,
            [RoleConstants.Moderator],
            HttpMethod.Get,
            "/api/moderation/reports");
        var queueResponse = await client.SendAsync(queueRequest);
        var queueBody = await queueResponse.Content.ReadFromJsonAsync<PagedReportsResponse>();

        Assert.Equal(HttpStatusCode.OK, queueResponse.StatusCode);
        Assert.NotNull(queueBody);
        Assert.Empty(queueBody!.Items);

        using var actionRequest = AuthenticatedRequest(
            moderator,
            [RoleConstants.Moderator],
            HttpMethod.Put,
            $"/api/moderation/reports/{report.Id}/status",
            csrf,
            new { status = ReportStatus.Resolved });
        var actionResponse = await client.SendAsync(actionRequest);

        Assert.Equal(HttpStatusCode.Forbidden, actionResponse.StatusCode);
    }

    [Fact]
    public async Task GroupModeratorMembershipAlone_CannotAccessGlobalModerationQueue()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var owner = await factory.AddUserAsync("api-group-owner", RoleConstants.User);
        var groupModerator = await factory.AddUserAsync("api-group-moderator-only", RoleConstants.User);
        await factory.WithDbAsync(db =>
        {
            var group = new Group
            {
                Id = Guid.NewGuid(),
                Name = "Local moderation group",
                Description = "Group role should not grant global moderation.",
                Visibility = GroupVisibility.Public,
                OwnerId = owner.Id,
                CreatedAt = DateTime.UtcNow
            };
            db.Groups.Add(group);
            db.GroupMemberships.Add(new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = group.Id,
                UserId = owner.Id,
                Role = GroupRole.Owner,
                JoinedAt = DateTime.UtcNow
            });
            db.GroupMemberships.Add(new GroupMembership
            {
                Id = Guid.NewGuid(),
                GroupId = group.Id,
                UserId = groupModerator.Id,
                Role = GroupRole.GroupModerator,
                JoinedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });

        using var request = AuthenticatedRequest(
            groupModerator,
            [RoleConstants.User],
            HttpMethod.Get,
            "/api/moderation/reports");
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UnsupportedTargetRemoval_ReturnsProblemDetailsAndDoesNotAudit()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("api-target-admin", RoleConstants.Admin);
        var reporter = await factory.AddUserAsync("api-target-reporter", RoleConstants.User);
        var target = await factory.AddUserAsync("api-target-user", RoleConstants.User);
        var report = new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = reporter.Id,
            TargetType = ReportTargetType.User,
            TargetId = target.Id,
            Reason = "Unsupported target test",
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        await factory.WithDbAsync(db =>
        {
            db.Reports.Add(report);
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var request = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            HttpMethod.Delete,
            $"/api/moderation/reports/{report.Id}/target",
            csrf,
            new { reason = "Remove account" });
        var response = await client.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(400, json.RootElement.GetProperty("status").GetInt32());
        Assert.Contains("not a moderation queue target action", json.RootElement.GetProperty("message").GetString());
        await factory.WithDbAsync(async db => Assert.False(await db.ModerationAuditLogs.AnyAsync()));
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        HttpMethod method,
        string url)
    {
        var request = new HttpRequestMessage(method, url);
        ApiTestFactory.AddTestAuthHeaders(request, user, roles);
        return request;
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        HttpMethod method,
        string url,
        CsrfState csrf,
        object body)
    {
        var request = AuthenticatedRequest(user, roles, method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        request.Content = JsonContent.Create(body);
        return request;
    }

    private sealed record PagedReportsResponse(List<ReportItemResponse> Items, int TotalCount);
    private sealed record ReportItemResponse(Guid Id);
}
