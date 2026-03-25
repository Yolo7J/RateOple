import clsx from 'clsx';

const styles = {
  item: [
    'flex items-center justify-between gap-3 rounded-lg border border-[var(--border)]',
    'bg-[var(--card-bg)] p-3',
  ].join(' '),
  unread: 'border-[var(--accent)]',
  highlight: 'live-highlight',
  title: 'text-sm font-semibold text-[var(--text-primary)]',
  muted: 'text-xs text-[var(--text-muted)]',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
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
  const label = NOTIFICATION_LABELS[notification.type] || `Notification type ${notification.type}`;
  const createdAtMs = new Date(notification.createdAt).getTime();
  const isRecent = Number.isFinite(createdAtMs) && Date.now() - createdAtMs < 60000;

  return (
    <article className={clsx(styles.item, !notification.read && styles.unread, isRecent && styles.highlight)}>
      <div>
        <h3 className={styles.title}>{label}</h3>
        <p className={styles.muted}>{new Date(notification.createdAt).toLocaleString()}</p>
      </div>
      {!notification.read ? (
        <button className={styles.button} type="button" onClick={() => onMarkRead(notification.id)} disabled={disabled}>
          Mark read
        </button>
      ) : (
        <span className={styles.muted}>Read</span>
      )}
    </article>
  );
}

export default NotificationItem;
