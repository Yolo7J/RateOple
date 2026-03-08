using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Moderation.Services;

public class ModerationService : IModerationService
{
    private readonly ApplicationDbContext _context;

    public ModerationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReportDto> CreateReportAsync(Guid reporterId, CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            throw new ArgumentException("Reason is required.");

        var targetExists = await CheckTargetExistsAsync(dto.TargetType, dto.TargetId);
        if (!targetExists)
            throw new KeyNotFoundException("Report target not found.");

        var existing = await _context.Reports
            .FirstOrDefaultAsync(r =>
                r.ReporterId == reporterId &&
                r.TargetType == dto.TargetType &&
                r.TargetId == dto.TargetId);

        if (existing != null)
            return Map(existing);

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
        return Map(report);
    }

    public async Task<PagedReportsDto> GetReportsAsync(ReportQueryDto query)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 30 : Math.Min(query.PageSize, 100);

        var q = _context.Reports.AsNoTracking().AsQueryable();
        if (query.Status.HasValue)
            q = q.Where(r => r.Status == query.Status.Value);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedReportsDto
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
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
        return Map(report);
    }

    public async Task<ModeratorAssignmentDto> AssignModeratorAsync(Guid assignedById, CreateModeratorAssignmentDto dto)
    {
        if (dto.ScopeType == ModeratorScopeType.Global && dto.ScopeId.HasValue)
            throw new ArgumentException("ScopeId must be null for global assignments.");
        if (dto.ScopeType != ModeratorScopeType.Global && !dto.ScopeId.HasValue)
            throw new ArgumentException("ScopeId is required for non-global assignments.");

        var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
            throw new KeyNotFoundException("User not found.");

        var assignment = await _context.ModeratorAssignments
            .FirstOrDefaultAsync(x =>
                x.UserId == dto.UserId &&
                x.ScopeType == dto.ScopeType &&
                x.ScopeId == dto.ScopeId);

        if (assignment == null)
        {
            assignment = new ModeratorAssignment
            {
                UserId = dto.UserId,
                ScopeType = dto.ScopeType,
                ScopeId = dto.ScopeId,
                AssignedAt = DateTime.UtcNow,
                AssignedById = assignedById
            };
            _context.ModeratorAssignments.Add(assignment);
            await _context.SaveChangesAsync();
        }

        return Map(assignment);
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

        return items.Select(Map).ToList();
    }

    public async Task RemoveAssignmentAsync(Guid userId, ModeratorScopeType scopeType, Guid? scopeId)
    {
        var assignment = await _context.ModeratorAssignments
            .FirstOrDefaultAsync(x =>
                x.UserId == userId &&
                x.ScopeType == scopeType &&
                x.ScopeId == scopeId);

        if (assignment == null)
            return;

        _context.ModeratorAssignments.Remove(assignment);
        await _context.SaveChangesAsync();
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

    private static ReportDto Map(Report report) => new()
    {
        Id = report.Id,
        ReporterId = report.ReporterId,
        TargetType = report.TargetType,
        TargetId = report.TargetId,
        Reason = report.Reason,
        Status = report.Status,
        CreatedAt = report.CreatedAt,
        UpdatedAt = report.UpdatedAt,
        ReviewedById = report.ReviewedById
    };

    private static ModeratorAssignmentDto Map(ModeratorAssignment assignment) => new()
    {
        UserId = assignment.UserId,
        ScopeType = assignment.ScopeType,
        ScopeId = assignment.ScopeId,
        AssignedAt = assignment.AssignedAt,
        AssignedById = assignment.AssignedById
    };
}
