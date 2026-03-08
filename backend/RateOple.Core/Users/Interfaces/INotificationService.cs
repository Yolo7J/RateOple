using RateOple.Constants.Enums;
using RateOple.Core.Users.DTOs;

namespace RateOple.Core.Contracts;

public interface INotificationService
{
    Task<NotificationDto> CreateAsync(Guid userId, NotificationType type, Guid? entityId = null);
    Task<PagedNotificationsDto> GetForUserAsync(Guid userId, NotificationQueryDto query);
    Task MarkAsReadAsync(Guid userId, Guid notificationId);
    Task<int> MarkAllAsReadAsync(Guid userId);
}
