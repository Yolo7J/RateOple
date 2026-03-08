using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Contracts;

public interface INotificationPublisher
{
    Task PublishAsync(NotificationEnvelope notification, CancellationToken cancellationToken = default);
}
