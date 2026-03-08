import './notifications.css';

const NOTIFICATION_LABELS = {
  1: 'System notification',
  2: 'Report status updated',
  3: 'Moderator assignment',
};

function NotificationItem({ notification, onMarkRead, disabled = false }) {
  const label = NOTIFICATION_LABELS[notification.type] || `Notification type ${notification.type}`;

  return (
    <article className={`ro-notification-item${notification.read ? '' : ' is-unread'}`}>
      <div className="ro-notification-main">
        <h3>{label}</h3>
        <p className="ro-muted">{new Date(notification.createdAt).toLocaleString()}</p>
      </div>
      {!notification.read ? (
        <button type="button" onClick={() => onMarkRead(notification.id)} disabled={disabled}>
          Mark read
        </button>
      ) : (
        <span className="ro-muted">Read</span>
      )}
    </article>
  );
}

export default NotificationItem;
