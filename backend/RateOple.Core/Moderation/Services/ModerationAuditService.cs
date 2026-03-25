using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
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
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 30 : Math.Min(query.PageSize, 100);

        var q = _context.ModerationAuditLogs.AsNoTracking().AsQueryable();
        if (query.Action.HasValue)
            q = q.Where(l => l.Action == query.Action.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedModerationAuditLogsDto
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        };
    }

    private static ModerationAuditLogDto Map(ModerationAuditLog log) => new()
    {
        Id = log.Id,
        Action = log.Action,
        PerformedById = log.PerformedById,
        TargetId = log.TargetId,
        ScopeType = log.ScopeType,
        ScopeId = log.ScopeId,
        Notes = log.Notes,
        CreatedAt = log.CreatedAt
    };
}
