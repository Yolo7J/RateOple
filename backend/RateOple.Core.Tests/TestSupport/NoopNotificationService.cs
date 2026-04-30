using RateOple.Constants.Enums;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Tests.TestSupport;

public sealed class NoopNotificationService : INotificationService
{
    public List<(Guid UserId, NotificationType Type, Guid? EntityId)> Created { get; } = [];

    public Task<NotificationDto> CreateAsync(Guid userId, NotificationType type, Guid? entityId = null)
    {
        Created.Add((userId, type, entityId));

        return Task.FromResult(new NotificationDto
        {
            Id = Guid.NewGuid(),
            Type = type,
            EntityId = entityId,
            Read = false,
            CreatedAt = DateTime.UtcNow
        });
    }

    public Task<PagedNotificationsDto> GetForUserAsync(Guid userId, NotificationQueryDto query)
    {
        return Task.FromResult(new PagedNotificationsDto());
    }

    public Task MarkAsReadAsync(Guid userId, Guid notificationId) => Task.CompletedTask;

    public Task<int> MarkAllAsReadAsync(Guid userId) => Task.FromResult(0);
}
