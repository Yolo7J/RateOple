using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Quotas;
using RateOple.Core.Users.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Users.Services;

public sealed class SuspensionAppealService : ISuspensionAppealService
{
    private readonly ApplicationDbContext _context;
    private readonly IUserQuotaService? _quotaService;

    public SuspensionAppealService(ApplicationDbContext context, IUserQuotaService? quotaService = null)
    {
        _context = context;
        _quotaService = quotaService;
    }

    public async Task<SuspensionAppealDto> CreateAsync(Guid userId, CreateSuspensionAppealDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("User not found.");

        if (!user.IsSuspended)
            throw new InvalidOperationException("Only suspended users can submit suspension appeals.");

        if (string.IsNullOrWhiteSpace(dto.Text))
            throw new ArgumentException("Appeal text is required.");

        if (_quotaService != null)
        {
            await _quotaService.EnsureCanCreateSuspensionAppealAsync(userId);
        }
        else
        {
            var hasPending = await _context.SuspensionAppeals
                .AnyAsync(a => a.UserId == userId && a.Status == SuspensionAppealStatus.Pending);
            if (hasPending)
                throw new InvalidOperationException("You already have a pending suspension appeal.");

            var rejectedTooRecently = await _context.SuspensionAppeals
                .AnyAsync(a =>
                    a.UserId == userId &&
                    a.Status == SuspensionAppealStatus.Rejected &&
                    a.ResolvedAt != null &&
                    a.ResolvedAt > DateTime.UtcNow.AddDays(-7));
            if (rejectedTooRecently)
                throw new InvalidOperationException("You can submit another appeal 7 days after the last rejected appeal.");

            var recentAttempts = await _context.SuspensionAppeals
                .CountAsync(a => a.UserId == userId && a.CreatedAt > DateTime.UtcNow.AddHours(-24));
            if (recentAttempts >= 3)
                throw new InvalidOperationException("Suspension appeal attempt limit reached.");
        }

        var appeal = new SuspensionAppeal
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Text = dto.Text.Trim(),
            Status = SuspensionAppealStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.SuspensionAppeals.Add(appeal);
        await _context.SaveChangesAsync();
        return Map(appeal);
    }

    public async Task<SuspensionAppealDto> ResolveAsync(Guid actorId, Guid appealId, ResolveSuspensionAppealDto dto)
    {
        if (dto.Status is not (SuspensionAppealStatus.Accepted or SuspensionAppealStatus.Rejected))
            throw new ArgumentException("Appeal resolution status must be Accepted or Rejected.");

        var appeal = await _context.SuspensionAppeals
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == appealId)
            ?? throw new KeyNotFoundException("Suspension appeal not found.");

        if (appeal.Status != SuspensionAppealStatus.Pending)
            throw new InvalidOperationException("Only pending appeals can be resolved.");

        appeal.Status = dto.Status;
        appeal.ResolvedAt = DateTime.UtcNow;
        appeal.ResolvedByUserId = actorId;
        appeal.ResolutionNote = string.IsNullOrWhiteSpace(dto.ResolutionNote) ? null : dto.ResolutionNote.Trim();

        if (dto.Status == SuspensionAppealStatus.Accepted)
        {
            appeal.User.IsSuspended = false;
            appeal.User.SuspendedAt = null;
            appeal.User.SuspensionReason = null;
        }

        await _context.SaveChangesAsync();
        return Map(appeal);
    }

    private static SuspensionAppealDto Map(SuspensionAppeal appeal) => new()
    {
        Id = appeal.Id,
        UserId = appeal.UserId,
        Text = appeal.Text,
        Status = appeal.Status,
        CreatedAt = appeal.CreatedAt,
        ResolvedAt = appeal.ResolvedAt,
        ResolvedByUserId = appeal.ResolvedByUserId,
        ResolutionNote = appeal.ResolutionNote
    };
}
