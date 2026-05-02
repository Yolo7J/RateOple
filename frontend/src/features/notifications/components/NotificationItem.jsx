import clsx from 'clsx';
import { useState } from 'react';
import Badge from '../../../shared/ui/Badge';
import Button from '../../../shared/ui/Button';

const styles = {
  item: [
    'ui-card flex items-center justify-between gap-3 p-3',
  ].join(' '),
  unread: 'border-[var(--accent)]',
  highlight: 'live-highlight',
  title: 'text-sm font-semibold text-[var(--text-primary)]',
  muted: 'text-xs text-[var(--text-muted)]',
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
      <div>
        <h3 className={styles.title}>{label}</h3>
        <p className={styles.muted}>{new Date(notification.createdAt).toLocaleString()}</p>
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
