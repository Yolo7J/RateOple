import clsx from 'clsx';
import { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';
import { formatDate } from '../../../shared/utils/formatDate';

const styles = {
  item: 'notification-item',
  unread: 'notification-item--unread',
  highlight: 'live-highlight',
  icon: 'notification-item__icon',
  title: 'notification-item__title',
  muted: 'notification-item__meta',
};

const NOTIFICATION_LABELS = {
  1: 'System notification',
  2: 'Report status updated',
  3: 'Moderator assignment',
  4: 'You were banned from a group',
  5: 'You were unbanned from a group',
  6: 'Your comment was removed',
};

function NotificationItem({ notification, onMarkRead, disabled = false }) {
  const [now] = useState(() => Date.now());
  const label = NOTIFICATION_LABELS[notification.type] || `Notification type ${notification.type}`;
  const createdAtMs = new Date(notification.createdAt).getTime();
  const isRecent = Number.isFinite(createdAtMs) && now - createdAtMs < 60000;

  return (
    <article className={clsx(styles.item, !notification.read && styles.unread, isRecent && styles.highlight)}>
      <div className={styles.icon} aria-hidden="true">
        {notification.read ? <CheckCircle2 size={18} strokeWidth={2} /> : <Bell size={18} strokeWidth={2} />}
      </div>
      <div className="notification-item__body">
        <h3 className={styles.title}>{label}</h3>
        <p className={styles.muted}>{formatDate(notification.createdAt)}</p>
      </div>
      {!notification.read ? (
        <Button size="sm" onClick={() => onMarkRead(notification.id)} disabled={disabled}>
          Mark read
        </Button>
      ) : (
        <Badge>Read</Badge>
      )}
    </article>
  );
}

export default NotificationItem;
