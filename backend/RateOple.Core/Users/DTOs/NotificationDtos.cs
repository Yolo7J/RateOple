using RateOple.Constants.Enums;

namespace RateOple.Core.Users.DTOs;

public class NotificationDto
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public Guid? EntityId { get; set; }
    public bool Read { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationQueryDto
{
    public bool? UnreadOnly { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 30;
}

public class PagedNotificationsDto
{
    public List<NotificationDto> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class NotificationEnvelope
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public NotificationType Type { get; set; }
    public Guid? EntityId { get; set; }
    public DateTime CreatedAt { get; set; }
}
