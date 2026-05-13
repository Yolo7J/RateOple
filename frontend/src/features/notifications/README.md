# Notifications Feature

Notifications expose persisted user notifications with SignalR realtime updates and normal API fallback.

Current structure:

- `pages/NotificationsPage.jsx` renders the authenticated notifications inbox.
- `components/NotificationItem.jsx` renders individual notification rows/cards.
- `queries/useNotificationsQuery.js` loads paged notification data.
- `queries/useNotificationMutations.js` marks one or all notifications as read.
- `realtime/useNotificationRealtime.js` subscribes to notification SignalR events.
- `services/notificationService.js` wraps `/api/notifications` endpoints.
- `notifications.css` owns feature-specific notification styles.

Contract notes:

- Notifications are persisted by the backend first; SignalR is a realtime delivery layer, not the source of truth.
- The SignalR hub is `/hubs/notifications` and uses authenticated user identity for per-user delivery.
