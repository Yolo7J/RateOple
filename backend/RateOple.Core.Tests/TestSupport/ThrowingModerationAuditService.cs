using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Moderation.DTOs;

namespace RateOple.Core.Tests.TestSupport;

public sealed class ThrowingModerationAuditService : IModerationAuditService
{
    public const string LogFailureMessage = "Injected moderation audit failure.";

    public bool ThrowOnLog { get; set; } = true;
    public int LogCalls { get; private set; }

    public Task LogAsync(
        ModerationAuditAction action,
        Guid performedById,
        Guid targetId,
        ModeratorScopeType? scopeType = null,
        Guid? scopeId = null,
        string? notes = null)
    {
        LogCalls++;
        if (ThrowOnLog)
            throw new InvalidOperationException(LogFailureMessage);

        return Task.CompletedTask;
    }

    public Task<PagedModerationAuditLogsDto> GetLogsAsync(ModerationAuditLogQueryDto query)
    {
        return Task.FromResult(new PagedModerationAuditLogsDto());
    }
}
