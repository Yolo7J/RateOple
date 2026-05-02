import { useState } from 'react';
import { useNotificationsQuery } from '../queries/useNotificationsQuery';
import { useNotificationMutations } from '../queries/useNotificationMutations';
import NotificationItem from '../components/NotificationItem';
import PageLayout from '../../../layouts/PageLayout';
import Container from '../../../shared/ui/Container';
import Stack from '../../../shared/ui/Stack';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';
import PageHeader from '../../../shared/ui/PageHeader';

const styles = {
  pageStack: 'gap-6',
  actions: 'flex flex-wrap gap-2',
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
          <PageHeader title="Notifications" />
          <div className={styles.actions}>
            <Button
              onClick={() => setUnreadOnly(false)}
              disabled={unreadOnly === false}
            >
              All
            </Button>
            <Button
              onClick={() => setUnreadOnly(true)}
              disabled={unreadOnly === true}
            >
              Unread
            </Button>
            <Button onClick={handleMarkAllRead} disabled={mutating}>
              Mark all read
            </Button>
          </div>

          {loading ? <LoadingState label="Loading notifications..." /> : null}
          {error ? <InlineMessage tone="error">Failed to load notifications.</InlineMessage> : null}

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
              {items.length === 0 ? <EmptyState title="No notifications" /> : null}
            </section>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default NotificationsPage;
