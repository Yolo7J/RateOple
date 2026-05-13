using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RateOple.Constants.Constants;
using RateOple.Core.Contracts;
using RateOple.Core.Users.Options;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Users.Services;

public sealed class UnconfirmedAccountCleanupService : IUnconfirmedAccountCleanupService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<User> _userManager;
    private readonly UnconfirmedAccountCleanupOptions _options;
    private readonly ILogger<UnconfirmedAccountCleanupService> _logger;

    public UnconfirmedAccountCleanupService(
        ApplicationDbContext context,
        UserManager<User> userManager,
        IOptions<UnconfirmedAccountCleanupOptions> options,
        ILogger<UnconfirmedAccountCleanupService> logger)
    {
        _context = context;
        _userManager = userManager;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int> CleanupAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-Math.Max(1, _options.MaxAgeHours));
        var candidates = await _context.Users
            .Where(user =>
                !user.EmailConfirmed &&
                !user.IsSuspended &&
                user.CreatedAt < cutoff)
            .OrderBy(user => user.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        var deleted = 0;
        foreach (var user in candidates)
        {
            if (!await IsSafeToDeleteAsync(user, cancellationToken))
                continue;

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
            await _context.RefreshTokens
                .Where(token => token.UserId == user.Id)
                .ExecuteDeleteAsync(cancellationToken);
            await _context.UserProfiles
                .Where(profile => profile.UserId == user.Id)
                .ExecuteDeleteAsync(cancellationToken);
            await _context.Notifications
                .Where(notification => notification.UserId == user.Id)
                .ExecuteDeleteAsync(cancellationToken);
            await _context.UserGenreScores
                .Where(score => score.UserId == user.Id)
                .ExecuteDeleteAsync(cancellationToken);

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                _logger.LogWarning(
                    "Failed to delete unconfirmed account {UserId}: {Errors}",
                    user.Id,
                    string.Join("; ", result.Errors.Select(error => error.Description)));
                await transaction.RollbackAsync(cancellationToken);
                continue;
            }

            await transaction.CommitAsync(cancellationToken);
            deleted++;
        }

        return deleted;
    }

    private async Task<bool> IsSafeToDeleteAsync(User user, CancellationToken cancellationToken)
    {
        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Any(role => !string.Equals(role, RoleConstants.User, StringComparison.OrdinalIgnoreCase)))
            return false;

        if (await _context.ModeratorAssignments.AnyAsync(a => a.UserId == user.Id, cancellationToken))
            return false;

        return !await HasUserGeneratedContentAsync(user.Id, cancellationToken);
    }

    private async Task<bool> HasUserGeneratedContentAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await _context.Ratings.AnyAsync(r => r.UserId == userId, cancellationToken)
            || await _context.Reviews.AnyAsync(r => r.UserId == userId, cancellationToken)
            || await _context.Comments.AnyAsync(c => c.UserId == userId, cancellationToken)
            || await _context.Collections.AnyAsync(c => c.OwnerId == userId, cancellationToken)
            || await _context.CollectionItems.AnyAsync(i => i.Collection.OwnerId == userId, cancellationToken)
            || await _context.FollowCollections.AnyAsync(f => f.UserId == userId, cancellationToken)
            || await _context.Follows.AnyAsync(f => f.FollowerId == userId || f.FollowingId == userId, cancellationToken)
            || await _context.Groups.AnyAsync(g => g.OwnerId == userId, cancellationToken)
            || await _context.GroupMemberships.AnyAsync(m => m.UserId == userId, cancellationToken)
            || await _context.GroupPosts.AnyAsync(p => p.UserId == userId, cancellationToken)
            || await _context.GroupPostVotes.AnyAsync(v => v.UserId == userId, cancellationToken)
            || await _context.GroupBans.AnyAsync(b => b.UserId == userId || b.BannedById == userId || b.RevokedById == userId, cancellationToken)
            || await _context.GroupStaffMessages.AnyAsync(m => m.AuthorId == userId, cancellationToken)
            || await _context.UserMediaStatuses.AnyAsync(s => s.UserId == userId, cancellationToken)
            || await _context.MediaInteractions.AnyAsync(i => i.UserId == userId, cancellationToken)
            || await _context.Reports.AnyAsync(r => r.ReporterId == userId || r.ReviewedById == userId, cancellationToken)
            || await _context.ModerationAuditLogs.AnyAsync(l => l.PerformedById == userId || l.TargetId == userId, cancellationToken)
            || await _context.SuspensionAppeals.AnyAsync(a => a.UserId == userId || a.ResolvedByUserId == userId, cancellationToken);
    }
}
