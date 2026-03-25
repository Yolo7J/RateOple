using Microsoft.AspNetCore.SignalR;
using RateOple.Core.Moderation.DTOs;
using RateOple.Core.Moderation.Interfaces;
using RateOple.Hubs;

namespace RateOple.Notifications;

public class SignalRModerationRealtimePublisher : IModerationRealtimePublisher
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public SignalRModerationRealtimePublisher(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task ReportUpdatedAsync(ReportDto report, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.Group(NotificationHub.ModerationGroup)
            .SendAsync("ReportUpdated", report, cancellationToken);
    }

    public Task AssignmentUpdatedAsync(ModeratorAssignmentUpdateDto update, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.Group(NotificationHub.ModerationGroup)
            .SendAsync("AssignmentUpdated", update, cancellationToken);
    }
}
