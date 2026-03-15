import { useState } from 'react';
import { useNotificationsQuery } from '../queries/useNotificationsQuery';
import { useNotificationMutations } from '../queries/useNotificationMutations';
import NotificationItem from '../components/NotificationItem';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';

const styles = {
  pageStack: 'gap-6',
  title: 'text-3xl font-semibold text-[var(--text-primary)]',
  muted: 'text-[var(--text-muted)]',
  error: 'text-[#ff7f7f]',
  actions: 'flex flex-wrap gap-2',
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
  list: 'grid gap-3',
};

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
    <PageLayout>
      <Container>
        <Stack className={styles.pageStack}>
          <h1 className={styles.title}>Notifications</h1>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              onClick={() => setUnreadOnly(false)}
              disabled={unreadOnly === false}
            >
              All
            </button>
            <button
              className={styles.button}
              type="button"
              onClick={() => setUnreadOnly(true)}
              disabled={unreadOnly === true}
            >
              Unread
            </button>
            <button className={styles.button} type="button" onClick={handleMarkAllRead} disabled={mutating}>
              Mark all read
            </button>
          </div>

          {loading ? <p className={styles.muted}>Loading notifications...</p> : null}
          {error ? <p className={styles.error}>Failed to load notifications.</p> : null}

          {!loading && !error ? (
            <section className={styles.list}>
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  disabled={mutating}
                />
              ))}
              {items.length === 0 ? <p className={styles.muted}>No notifications.</p> : null}
            </section>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default NotificationsPage;
