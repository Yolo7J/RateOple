using RateOple.Constants.Enums;
using RateOple.Core.Moderation.DTOs;

namespace RateOple.Core.Contracts;

public interface IModerationAuditService
{
    Task LogAsync(
        ModerationAuditAction action,
        Guid performedById,
        Guid targetId,
        ModeratorScopeType? scopeType = null,
        Guid? scopeId = null,
        string? notes = null);

    Task<PagedModerationAuditLogsDto> GetLogsAsync(ModerationAuditLogQueryDto query);
}
