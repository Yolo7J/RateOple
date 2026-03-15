import { useState } from 'react';
import { useNotificationsQuery } from '../queries/useNotificationsQuery';
import { useNotificationMutations } from '../queries/useNotificationMutations';
import NotificationItem from '../components/NotificationItem';
import '../components/notifications.css';
import './NotificationsPage.css';

function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error } = useNotificationsQuery({ page: 1, pageSize: 50, unreadOnly }, true);
  const { markRead, markAllRead, loading: mutating } = useNotificationMutations();

  const items = Array.isArray(data?.items) ? data.items : [];

  const handleMarkRead = async (id) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <main className="ro-page">
      <h1>Notifications</h1>
      <div className="ro-notification-actions">
        <button type="button" onClick={() => setUnreadOnly(false)} disabled={unreadOnly === false}>
          All
        </button>
        <button type="button" onClick={() => setUnreadOnly(true)} disabled={unreadOnly === true}>
          Unread
        </button>
        <button type="button" onClick={handleMarkAllRead} disabled={mutating}>
          Mark all read
        </button>
      </div>

      {loading ? <p>Loading notifications...</p> : null}
      {error ? <p className="ro-error">Failed to load notifications.</p> : null}

      {!loading && !error ? (
        <section className="ro-notification-list">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              disabled={mutating}
            />
          ))}
          {items.length === 0 ? <p className="ro-muted">No notifications.</p> : null}
        </section>
      ) : null}
    </main>
  );
}

export default NotificationsPage;
