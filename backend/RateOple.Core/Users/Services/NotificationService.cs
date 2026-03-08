using Microsoft.EntityFrameworkCore;
using RateOple.Constants.Enums;
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
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 30 : Math.Min(query.PageSize, 100);

        var q = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .AsQueryable();

        if (query.UnreadOnly == true)
            q = q.Where(n => !n.Read);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedNotificationsDto
        {
            Items = items.Select(Map).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
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
