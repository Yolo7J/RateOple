import { useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import clsx from 'clsx';
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
import '../notifications.css';

function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error } = useNotificationsQuery({ page: 1, pageSize: 50, unreadOnly }, true);
  const { markRead, markAllRead, loading: mutating } = useNotificationMutations();

  const items = Array.isArray(data?.items) ? data.items : [];
  const unreadCount = items.filter((item) => !item.read).length;

  const handleMarkRead = async (id) => {
    await markRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  return (
    <PageLayout>
      <Container>
        <Stack className="gap-6">
          <section className="notifications-hero" aria-labelledby="notifications-title">
            <div>
              <p className="account-eyebrow">Account signals</p>
              <h1 id="notifications-title">Notifications</h1>
              <p>Moderation, group, and system updates for your RateOple account.</p>
            </div>
            <div className="notifications-hero-count" aria-label={`${unreadCount} unread notifications`}>
              <Bell size={22} aria-hidden="true" />
              <strong>{unreadCount}</strong>
              <span>unread</span>
            </div>
          </section>

          <section className="notifications-toolbar" aria-label="Notification filters">
            <div className="notifications-filter-group" role="tablist" aria-label="Notification view">
              <button
                type="button"
                role="tab"
                aria-selected={!unreadOnly}
                className={clsx('notifications-filter', !unreadOnly && 'notifications-filter--active')}
                onClick={() => setUnreadOnly(false)}
              >
                <Inbox size={16} aria-hidden="true" />
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={unreadOnly}
                className={clsx('notifications-filter', unreadOnly && 'notifications-filter--active')}
                onClick={() => setUnreadOnly(true)}
              >
                <Bell size={16} aria-hidden="true" />
                Unread
              </button>
            </div>
            <Button onClick={handleMarkAllRead} disabled={mutating || unreadCount === 0}>
              <CheckCheck size={16} aria-hidden="true" />
              Mark all read
            </Button>
          </section>

          {loading ? <LoadingState label="Loading notifications..." /> : null}
          {error ? <InlineMessage tone="error">Failed to load notifications.</InlineMessage> : null}

          {!loading && !error ? (
            <section className="notifications-list" aria-label="Notifications">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  disabled={mutating}
                />
              ))}
              {items.length === 0 ? (
                <EmptyState
                  title={unreadOnly ? 'No unread notifications' : 'No notifications'}
                  description={unreadOnly ? 'Everything is read.' : 'Account updates will appear here.'}
                />
              ) : null}
            </section>
          ) : null}
        </Stack>
      </Container>
    </PageLayout>
  );
}

export default NotificationsPage;
