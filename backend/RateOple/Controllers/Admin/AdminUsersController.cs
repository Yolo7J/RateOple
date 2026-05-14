using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Constants;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Interfaces;
using RateOple.Extensions;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = PolicyConstants.RequireAdmin)]
public class AdminUsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly IModerationAuditService _auditService;
    private readonly IModerationRealtimePublisher _realtimePublisher;

    public AdminUsersController(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IModerationAuditService auditService,
        IModerationRealtimePublisher realtimePublisher)
    {
        _context = context;
        _userManager = userManager;
        _auditService = auditService;
        _realtimePublisher = realtimePublisher;
    }

    [HttpGet]
    public async Task<ActionResult<PagedAdminUsersDto>> SearchUsers(
        [FromQuery] string? query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var pagination = Pagination.Normalize(page, pageSize);
        var normalizedQuery = query?.Trim() ?? string.Empty;

        var usersQuery = _context.Users.AsNoTracking();
        if (normalizedQuery.Length > 0)
        {
            usersQuery = usersQuery.Where(user =>
                (user.UserName != null && user.UserName.Contains(normalizedQuery)) ||
                (user.Email != null && user.Email.Contains(normalizedQuery)) ||
                (user.Profile != null && user.Profile.DisplayName.Contains(normalizedQuery)));
        }

        var total = await usersQuery.CountAsync();
        var users = await usersQuery
            .OrderBy(user => user.Profile != null ? user.Profile.DisplayName : user.UserName)
            .ThenBy(user => user.Id)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .Select(user => new
            {
                user.Id,
                user.UserName,
                user.EmailConfirmed,
                user.IsSuspended,
                user.IsDeleted,
                user.LockoutEnd,
                user.PasswordHash,
                DisplayName = user.Profile != null ? user.Profile.DisplayName : user.UserName,
                AvatarUrl = user.Profile != null ? user.Profile.AvatarUrl : user.AvatarUrl
            })
            .ToListAsync();

        var roles = await GetRolesForUsersAsync(users.Select(user => user.Id).ToList());
        var items = users.Select(user => new AdminUserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            DisplayName = user.DisplayName ?? user.UserName ?? "Unknown user",
            AvatarUrl = user.AvatarUrl,
            EmailConfirmed = user.EmailConfirmed,
            IsSuspended = user.IsSuspended,
            IsLockedOut = IsLockedOut(user.LockoutEnd),
            IsDeleted = IsDeletedUser(user.IsDeleted, user.UserName, user.PasswordHash, user.LockoutEnd),
            Roles = roles.GetValueOrDefault(user.Id, [])
        }).ToList();

        return Ok(new PagedAdminUsersDto
        {
            Items = items,
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        });
    }

    [HttpPost("{userId:guid}/roles/admin")]
    public async Task<IActionResult> GrantAdmin(Guid userId)
    {
        await ChangeRoleAsync(userId, RoleConstants.Admin, grant: true);
        return NoContent();
    }

    [HttpDelete("{userId:guid}/roles/admin")]
    public async Task<IActionResult> RevokeAdmin(Guid userId)
    {
        await ChangeRoleAsync(userId, RoleConstants.Admin, grant: false);
        return NoContent();
    }

    [HttpPost("{userId:guid}/roles/moderator")]
    public async Task<IActionResult> GrantModerator(Guid userId)
    {
        await ChangeRoleAsync(userId, RoleConstants.Moderator, grant: true);
        return NoContent();
    }

    [HttpDelete("{userId:guid}/roles/moderator")]
    public async Task<IActionResult> RevokeModerator(Guid userId)
    {
        await ChangeRoleAsync(userId, RoleConstants.Moderator, grant: false);
        return NoContent();
    }

    [HttpPost("{userId:guid}/suspension")]
    public async Task<IActionResult> SuspendUser(Guid userId, SuspendUserDto dto)
    {
        var actorId = User.GetRequiredUserId();
        if (actorId == userId)
            throw new UnauthorizedAccessException("Users cannot suspend themselves.");

        var target = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        await EnsureActorCanManageSuspensionAsync(target);
        if (IsDeletedUser(target.IsDeleted, target.UserName, target.PasswordHash, target.LockoutEnd))
            throw new UnauthorizedAccessException("Deleted users cannot be suspended.");

        target.IsSuspended = true;
        target.SuspendedAt = DateTime.UtcNow;
        target.SuspensionReason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();
        await _userManager.UpdateAsync(target);

        await _context.RefreshTokens
            .Where(token => token.UserId == target.Id && !token.Revoked)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.Revoked, true));

        await _auditService.LogAsync(
            ModerationAuditAction.UserSuspended,
            actorId,
            target.Id,
            notes: target.SuspensionReason);

        return NoContent();
    }

    [HttpDelete("{userId:guid}/suspension")]
    public async Task<IActionResult> LiftSuspension(Guid userId)
    {
        var actorId = User.GetRequiredUserId();
        var target = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        await EnsureActorCanManageSuspensionAsync(target);

        if (!target.IsSuspended)
            return NoContent();

        target.IsSuspended = false;
        target.SuspendedAt = null;
        target.SuspensionReason = null;
        await _userManager.UpdateAsync(target);

        await _auditService.LogAsync(
            ModerationAuditAction.UserSuspensionLifted,
            actorId,
            target.Id,
            notes: "Suspension lifted by Admin/SuperAdmin.");

        return NoContent();
    }

    private async Task EnsureActorCanManageSuspensionAsync(User target)
    {
        if (User.IsInRole(RoleConstants.SuperAdmin))
            return;

        var targetRoles = (await _userManager.GetRolesAsync(target)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (targetRoles.Contains(RoleConstants.SuperAdmin) || targetRoles.Contains(RoleConstants.Admin))
            throw new UnauthorizedAccessException("Admins cannot manage suspension state for Admins or SuperAdmins.");
    }

    private async Task ChangeRoleAsync(Guid targetUserId, string role, bool grant)
    {
        if (role is not (RoleConstants.Admin or RoleConstants.Moderator))
            throw new ArgumentException("Unsupported role.");

        var actorId = User.GetRequiredUserId();
        if (actorId == targetUserId)
            throw new UnauthorizedAccessException("Users cannot modify their own global roles.");

        var actorIsSuperAdmin = User.IsInRole(RoleConstants.SuperAdmin);
        var actorIsAdmin = User.IsInRole(RoleConstants.Admin);
        if (role == RoleConstants.Admin && !actorIsSuperAdmin)
            throw new UnauthorizedAccessException("Only SuperAdmins can manage Admin roles.");
        if (role == RoleConstants.Moderator && !actorIsSuperAdmin && !actorIsAdmin)
            throw new UnauthorizedAccessException("Only Admins and SuperAdmins can manage Moderator roles.");

        var target = await _userManager.FindByIdAsync(targetUserId.ToString())
            ?? throw new KeyNotFoundException("User not found.");
        var targetRoles = (await _userManager.GetRolesAsync(target)).ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!actorIsSuperAdmin && targetRoles.Contains(RoleConstants.SuperAdmin))
            throw new UnauthorizedAccessException("Admins cannot modify SuperAdmins.");
        if (!actorIsSuperAdmin && targetRoles.Contains(RoleConstants.Admin))
            throw new UnauthorizedAccessException("Admins cannot modify Admin users.");
        if (grant && role == RoleConstants.Moderator && targetRoles.Contains(RoleConstants.Admin))
            throw new UnauthorizedAccessException("Admins cannot be assigned the Moderator role through this flow.");
        if (grant && role == RoleConstants.Moderator && targetRoles.Contains(RoleConstants.SuperAdmin))
            throw new UnauthorizedAccessException("SuperAdmins cannot be assigned the Moderator role through this flow.");
        if (grant && IsDeletedUser(target.IsDeleted, target.UserName, target.PasswordHash, target.LockoutEnd))
            throw new UnauthorizedAccessException("Deleted users cannot receive global staff roles.");
        if (grant && IsLockedOut(target.LockoutEnd))
            throw new UnauthorizedAccessException("Locked out users cannot receive global staff roles.");
        if (grant && role == RoleConstants.Moderator && !target.EmailConfirmed)
            throw new UnauthorizedAccessException("Only confirmed users can become Moderators.");

        if (grant && targetRoles.Contains(role))
            return;
        if (!grant && !targetRoles.Contains(role))
            return;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var assignmentUpdates = new List<ModeratorAssignmentUpdateDto>();

        IdentityResult result = grant
            ? await _userManager.AddToRoleAsync(target, role)
            : await _userManager.RemoveFromRoleAsync(target, role);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(error => error.Description)));

        if (!grant && role == RoleConstants.Moderator)
            assignmentUpdates = await RemoveModeratorAssignmentsAsync(actorId, target.Id);

        await _auditService.LogAsync(
            grant ? ModerationAuditAction.GlobalRoleGranted : ModerationAuditAction.GlobalRoleRevoked,
            actorId,
            target.Id,
            notes: $"{(grant ? "Granted" : "Revoked")} global {role} role.");

        await transaction.CommitAsync();

        foreach (var update in assignmentUpdates)
            await _realtimePublisher.AssignmentUpdatedAsync(update);
    }

    private async Task<List<ModeratorAssignmentUpdateDto>> RemoveModeratorAssignmentsAsync(Guid actorId, Guid targetUserId)
    {
        var assignments = await _context.ModeratorAssignments
            .Where(assignment => assignment.UserId == targetUserId)
            .ToListAsync();

        if (assignments.Count == 0)
            return [];

        _context.ModeratorAssignments.RemoveRange(assignments);
        await _context.SaveChangesAsync();
        var updates = new List<ModeratorAssignmentUpdateDto>();

        foreach (var assignment in assignments)
        {
            await _auditService.LogAsync(
                ModerationAuditAction.ModeratorUnassigned,
                actorId,
                targetUserId,
                assignment.ScopeType,
                assignment.ScopeId,
                "Revoked because the global Moderator role was removed.");

            updates.Add(new ModeratorAssignmentUpdateDto
            {
                Action = "Removed",
                UserId = targetUserId,
                ScopeType = assignment.ScopeType,
                ScopeId = assignment.ScopeType == ModeratorScopeType.Global ? null : assignment.ScopeId
            });
        }

        return updates;
    }

    private async Task<Dictionary<Guid, List<string>>> GetRolesForUsersAsync(List<Guid> userIds)
    {
        if (userIds.Count == 0)
            return new Dictionary<Guid, List<string>>();

        var roleRows = await _context.UserRoles
            .AsNoTracking()
            .Where(userRole => userIds.Contains(userRole.UserId))
            .Join(_context.Roles.AsNoTracking(),
                userRole => userRole.RoleId,
                role => role.Id,
                (userRole, role) => new { userRole.UserId, role.Name })
            .ToListAsync();

        return roleRows
            .GroupBy(row => row.UserId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(row => row.Name)
                    .Where(name => !string.IsNullOrWhiteSpace(name))
                    .Cast<string>()
                    .OrderBy(name => name)
                    .ToList());
    }

    private static bool IsLockedOut(DateTimeOffset? lockoutEnd)
    {
        return lockoutEnd.HasValue && lockoutEnd.Value > DateTimeOffset.UtcNow;
    }

    private static bool IsDeletedUser(bool isDeleted, string? userName, string? passwordHash, DateTimeOffset? lockoutEnd)
    {
        return isDeleted ||
               userName?.StartsWith("deleted_", StringComparison.OrdinalIgnoreCase) == true ||
               (passwordHash == null && IsLockedOut(lockoutEnd));
    }
}

public class AdminUserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool IsSuspended { get; set; }
    public bool IsLockedOut { get; set; }
    public bool IsDeleted { get; set; }
    public List<string> Roles { get; set; } = [];
}

public class SuspendUserDto
{
    public string? Reason { get; set; }
}

public class PagedAdminUsersDto
{
    public List<AdminUserDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
