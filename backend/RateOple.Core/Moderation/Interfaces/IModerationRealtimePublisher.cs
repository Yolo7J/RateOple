using RateOple.Core.Moderation.DTOs;

namespace RateOple.Core.Moderation.Interfaces;

public interface IModerationRealtimePublisher
{
    Task ReportUpdatedAsync(ReportDto report, CancellationToken cancellationToken = default);
    Task AssignmentUpdatedAsync(ModeratorAssignmentUpdateDto update, CancellationToken cancellationToken = default);
}
