using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Interfaces;

namespace RateOple.Core.Moderation.Services;

public class NoopModerationRealtimePublisher : IModerationRealtimePublisher
{
    public Task ReportUpdatedAsync(ReportDto report, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task AssignmentUpdatedAsync(ModeratorAssignmentUpdateDto update, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
