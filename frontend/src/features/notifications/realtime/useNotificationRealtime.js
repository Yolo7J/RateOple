import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNotificationHubConnection, startNotificationHub } from '../../../shared/signalr/signalrClient';

const toNotificationDto = (notification) => ({
  id: notification.id,
  type: notification.type,
  entityId: notification.entityId ?? null,
  read: false,
  createdAt: notification.createdAt,
});

const updateNotificationCache = (data, queryParams, notification) => {
  if (!data) return data;

  const nextItem = toNotificationDto(notification);
  if (data.items?.some((item) => item.id === nextItem.id)) {
    return data;
  }

  const page = queryParams?.page ?? data.page ?? 1;
  const pageSize = queryParams?.pageSize ?? data.pageSize ?? 30;
  const unreadOnly = queryParams?.unreadOnly === true;
  const includeItem = unreadOnly ? !nextItem.read : true;

  const items = Array.isArray(data.items) ? data.items : [];
  const nextItems = includeItem && page === 1 ? [nextItem, ...items].slice(0, pageSize) : items;
  const nextTotal = includeItem ? (data.totalCount ?? 0) + 1 : data.totalCount ?? 0;

  return {
    ...data,
    items: nextItems,
    totalCount: nextTotal,
  };
};

export const useNotificationRealtime = (enabled) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;

    const connection = getNotificationHubConnection();

    const handleNotification = (notification) => {
      const entries = queryClient.getQueriesData({ queryKey: ['notifications', 'list'] });
      entries.forEach(([key, data]) => {
        const queryParams = Array.isArray(key) ? key[2] : undefined;
        const nextData = updateNotificationCache(data, queryParams, notification);
        if (nextData !== data) {
          queryClient.setQueryData(key, nextData);
        }
      });
    };

    connection.off('ReceiveNotification', handleNotification);
    connection.on('ReceiveNotification', handleNotification);

    startNotificationHub().catch((error) => {
      console.error('SignalR connection failed:', error);
    });

    return () => {
      connection.off('ReceiveNotification', handleNotification);
    };
  }, [enabled, queryClient]);
};
