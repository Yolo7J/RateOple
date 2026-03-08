using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Users.Services;

public class NoopNotificationPublisher : INotificationPublisher
{
    public Task PublishAsync(NotificationEnvelope notification, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
