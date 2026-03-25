using Microsoft.AspNetCore.SignalR;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Hubs;

namespace RateOple.Notifications;

public class SignalRNotificationPublisher : INotificationPublisher
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public SignalRNotificationPublisher(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishAsync(NotificationEnvelope notification, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients.User(notification.UserId.ToString())
            .SendAsync("ReceiveNotification", notification, cancellationToken);
    }
}
