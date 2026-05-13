using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RateOple.Api.Tests.TestSupport;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Api.Tests.Admin;

public class AdminUserManagementContractTests
{
    [Theory]
    [InlineData(RoleConstants.User)]
    [InlineData(RoleConstants.Moderator)]
    public async Task NonAdminStaff_CannotAccessRoleManagementEndpoints(string role)
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var actor = await factory.AddUserAsync($"role-denied-{role.ToLowerInvariant()}", role);
        var target = await factory.AddUserAsync($"role-denied-target-{role.ToLowerInvariant()}", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, actor, role);

        using var request = AuthenticatedRequest(
            actor,
            [role],
            csrf,
            HttpMethod.Post,
            $"/api/admin/users/{target.Id}/roles/moderator");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanGrantAndRevokeModerator_AndRevokingRemovesAssignmentsAndAudits()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("role-admin", RoleConstants.Admin);
        var target = await factory.AddUserAsync("role-target", RoleConstants.User);
        await factory.WithDbAsync(db =>
        {
            db.ModeratorAssignments.Add(new ModeratorAssignment
            {
                UserId = target.Id,
                AssignedById = admin.Id,
                ScopeType = ModeratorScopeType.Global,
                ScopeId = Guid.Empty,
                AssignedAt = DateTime.UtcNow
            });
            return Task.CompletedTask;
        });
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var grant = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Post,
            $"/api/admin/users/{target.Id}/roles/moderator");
        var grantResponse = await client.SendAsync(grant);

        using var revoke = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Delete,
            $"/api/admin/users/{target.Id}/roles/moderator");
        var revokeResponse = await client.SendAsync(revoke);

        Assert.Equal(HttpStatusCode.NoContent, grantResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, revokeResponse.StatusCode);
        await factory.WithDbAsync(async db =>
        {
            var moderatorRole = await db.Roles.SingleAsync(role => role.Name == RoleConstants.Moderator);
            Assert.False(await db.UserRoles.AnyAsync(role => role.UserId == target.Id && role.RoleId == moderatorRole.Id));
            Assert.False(await db.ModeratorAssignments.AnyAsync(assignment => assignment.UserId == target.Id));
            Assert.True(await db.ModerationAuditLogs.AnyAsync(log =>
                log.Action == ModerationAuditAction.GlobalRoleGranted &&
                log.TargetId == target.Id));
            Assert.True(await db.ModerationAuditLogs.AnyAsync(log =>
                log.Action == ModerationAuditAction.GlobalRoleRevoked &&
                log.TargetId == target.Id));
            Assert.True(await db.ModerationAuditLogs.AnyAsync(log =>
                log.Action == ModerationAuditAction.ModeratorUnassigned &&
                log.TargetId == target.Id));
        });
    }

    [Fact]
    public async Task Admin_CannotGrantOrRevokeAdminOrModifySuperAdmin()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("limited-admin", RoleConstants.Admin);
        var otherAdmin = await factory.AddUserAsync("other-admin", RoleConstants.Admin);
        var superAdmin = await factory.AddUserAsync("super-target", RoleConstants.SuperAdmin);
        var user = await factory.AddUserAsync("plain-target", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var grantAdmin = AuthenticatedRequest(admin, [RoleConstants.Admin], csrf, HttpMethod.Post, $"/api/admin/users/{user.Id}/roles/admin");
        using var revokeAdmin = AuthenticatedRequest(admin, [RoleConstants.Admin], csrf, HttpMethod.Delete, $"/api/admin/users/{otherAdmin.Id}/roles/admin");
        using var modifySuper = AuthenticatedRequest(admin, [RoleConstants.Admin], csrf, HttpMethod.Post, $"/api/admin/users/{superAdmin.Id}/roles/moderator");

        var grantAdminResponse = await client.SendAsync(grantAdmin);
        var revokeAdminResponse = await client.SendAsync(revokeAdmin);
        var modifySuperResponse = await client.SendAsync(modifySuper);

        Assert.Equal(HttpStatusCode.Forbidden, grantAdminResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, revokeAdminResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, modifySuperResponse.StatusCode);
    }

    [Fact]
    public async Task SuperAdmin_CanGrantAndRevokeAdminAndModerator()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var superAdmin = await factory.AddUserAsync("super-admin", RoleConstants.SuperAdmin);
        var adminTarget = await factory.AddUserAsync("admin-target", RoleConstants.User);
        var moderatorTarget = await factory.AddUserAsync("moderator-target", RoleConstants.User);
        var csrf = await factory.GetCsrfAsync(client, superAdmin, RoleConstants.SuperAdmin);

        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(AuthenticatedRequest(superAdmin, [RoleConstants.SuperAdmin], csrf, HttpMethod.Post, $"/api/admin/users/{adminTarget.Id}/roles/admin"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(AuthenticatedRequest(superAdmin, [RoleConstants.SuperAdmin], csrf, HttpMethod.Delete, $"/api/admin/users/{adminTarget.Id}/roles/admin"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(AuthenticatedRequest(superAdmin, [RoleConstants.SuperAdmin], csrf, HttpMethod.Post, $"/api/admin/users/{moderatorTarget.Id}/roles/moderator"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(AuthenticatedRequest(superAdmin, [RoleConstants.SuperAdmin], csrf, HttpMethod.Delete, $"/api/admin/users/{moderatorTarget.Id}/roles/moderator"))).StatusCode);
    }

    [Fact]
    public async Task UserCannotModifyOwnRoles()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateManualCookieClient();
        var admin = await factory.AddUserAsync("self-admin", RoleConstants.Admin);
        var csrf = await factory.GetCsrfAsync(client, admin, RoleConstants.Admin);

        using var request = AuthenticatedRequest(
            admin,
            [RoleConstants.Admin],
            csrf,
            HttpMethod.Delete,
            $"/api/admin/users/{admin.Id}/roles/moderator");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ModeratorCandidateLookup_ExcludesIneligibleAndAlreadyAssignedUsers()
    {
        using var factory = new ApiTestFactory(useTestAuth: true);
        var client = factory.CreateClient();
        var admin = await factory.AddUserAsync("candidate-admin", RoleConstants.Admin);
        var superAdmin = await factory.AddUserAsync("candidate-super", RoleConstants.SuperAdmin);
        var eligible = await factory.AddUserAsync("candidate-eligible", RoleConstants.User);
        var existingModerator = await factory.AddUserAsync("candidate-existing-mod", RoleConstants.Moderator);
        var assigned = await factory.AddUserAsync("candidate-assigned", RoleConstants.Moderator);
        var locked = await factory.AddUserAsync("candidate-locked", RoleConstants.User);
        await factory.WithDbAsync(async db =>
        {
            var lockedUser = await db.Users.SingleAsync(user => user.Id == locked.Id);
            lockedUser.LockoutEnd = DateTimeOffset.UtcNow.AddDays(7);
            db.ModeratorAssignments.Add(new ModeratorAssignment
            {
                UserId = assigned.Id,
                AssignedById = admin.Id,
                ScopeType = ModeratorScopeType.Global,
                ScopeId = Guid.Empty,
                AssignedAt = DateTime.UtcNow
            });
        });

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/moderator-candidates/lookup?scopeType=1&search=candidate");
        ApiTestFactory.AddTestAuthHeaders(request, admin, RoleConstants.Admin);
        var response = await client.SendAsync(request);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var usernames = json.RootElement.GetProperty("items")
            .EnumerateArray()
            .Select(item => item.GetProperty("username").GetString())
            .ToHashSet();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(eligible.UserName, usernames);
        Assert.Contains(existingModerator.UserName, usernames);
        Assert.DoesNotContain(admin.UserName, usernames);
        Assert.DoesNotContain(superAdmin.UserName, usernames);
        Assert.DoesNotContain(assigned.UserName, usernames);
        Assert.DoesNotContain(locked.UserName, usernames);
        Assert.DoesNotContain(json.RootElement.GetProperty("items").EnumerateArray(), item => item.TryGetProperty("email", out _));
    }

    private static HttpRequestMessage AuthenticatedRequest(
        User user,
        string[] roles,
        CsrfState csrf,
        HttpMethod method,
        string url)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-CSRF-TOKEN", csrf.Token);
        request.Headers.Add("Cookie", csrf.Cookie);
        ApiTestFactory.AddTestAuthHeaders(request, user, roles);
        request.Content = JsonContent.Create(new { });
        return request;
    }
}
