using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
using RateOple.Core.Common;
using RateOple.Core.Contracts;
using RateOple.Core.Users.DTOs;
using RateOple.Infrastructure.Data;
using RateOple.Infrastructure.Data.Entities;

namespace RateOple.Core.Users.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationPublisher _publisher;

    public NotificationService(ApplicationDbContext context, INotificationPublisher publisher)
    {
        _context = context;
        _publisher = publisher;
    }

    public async Task<NotificationDto> CreateAsync(Guid userId, NotificationType type, Guid? entityId = null)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
            throw new KeyNotFoundException("Notification user not found.");

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            EntityId = entityId,
            Read = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Abstract publisher: currently no-op, can be replaced with websocket publisher later.
        await _publisher.PublishAsync(new NotificationEnvelope
        {
            Id = notification.Id,
            UserId = notification.UserId,
            Type = notification.Type,
            EntityId = notification.EntityId,
            CreatedAt = notification.CreatedAt
        });

        return Map(notification);
    }

    public async Task<PagedNotificationsDto> GetForUserAsync(Guid userId, NotificationQueryDto query)
    {
        query ??= new NotificationQueryDto();
        var pagination = Pagination.Normalize(query.Page, query.PageSize, defaultPageSize: 30);

        var q = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .AsQueryable();

        if (query.UnreadOnly == true)
            q = q.Where(n => !n.Read);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip((pagination.Page - 1) * pagination.PageSize)
            .Take(pagination.PageSize)
            .ToListAsync();

        return new PagedNotificationsDto
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = pagination.Page,
            PageSize = pagination.PageSize
        };
    }

    public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId)
            ?? throw new KeyNotFoundException("Notification not found.");

        if (notification.Read)
            return;

        notification.Read = true;
        await _context.SaveChangesAsync();
    }

    public async Task<int> MarkAllAsReadAsync(Guid userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.Read)
            .ToListAsync();

        if (unread.Count == 0)
            return 0;

        foreach (var notification in unread)
            notification.Read = true;

        await _context.SaveChangesAsync();
        return unread.Count;
    }

    private static NotificationDto Map(Notification notification) => new()
    {
        Id = notification.Id,
        Type = notification.Type,
        EntityId = notification.EntityId,
        Read = notification.Read,
        CreatedAt = notification.CreatedAt
    };
}
