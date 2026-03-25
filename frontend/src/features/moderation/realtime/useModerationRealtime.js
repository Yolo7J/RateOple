import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getNotificationHubConnection,
  startNotificationHub,
  subscribeToNotificationHubStatus,
} from '../../../shared/signalr/signalrClient';

const toKey = (value) => (value === null || value === undefined ? '' : String(value));

const matchesAssignmentFilter = (assignment, queryParams) => {
  if (!queryParams) return true;
  if (queryParams.scopeType && Number(queryParams.scopeType) !== Number(assignment.scopeType)) {
    return false;
  }
  if (queryParams.scopeId && toKey(queryParams.scopeId) !== toKey(assignment.scopeId)) {
    return false;
  }
  return true;
};

const updateAssignmentsCache = (data, queryParams, payload) => {
  const items = Array.isArray(data) ? data : [];
  const assignment = payload.assignment ?? {
    userId: payload.userId,
    scopeType: payload.scopeType,
    scopeId: payload.scopeId ?? null,
  };

  if (!assignment.userId) return data;

  const action = String(payload.action || '').toLowerCase();
  const keyMatch = (entry) =>
    entry.userId === assignment.userId &&
    Number(entry.scopeType) === Number(assignment.scopeType) &&
    toKey(entry.scopeId) === toKey(assignment.scopeId);

  const index = items.findIndex(keyMatch);

  if (action === 'removed') {
    if (index < 0) return data;
    const next = [...items];
    next.splice(index, 1);
    return next;
  }

  if (!matchesAssignmentFilter(assignment, queryParams)) {
    return data;
  }

  if (index >= 0) {
    const next = [...items];
    next[index] = assignment;
    return next;
  }

  return [assignment, ...items];
};

const updateReportsCache = (data, queryParams, report) => {
  if (!data || !Array.isArray(data.items)) return data;

  const statusFilter = queryParams?.status ? Number(queryParams.status) : null;
  const statusMatches = statusFilter === null || Number(report.status) === statusFilter;
  const page = queryParams?.page ?? data.page ?? 1;
  const pageSize = queryParams?.pageSize ?? data.pageSize ?? 30;
  const items = data.items;
  const index = items.findIndex((item) => item.id === report.id);

  if (!statusMatches) {
    if (index < 0) return data;
    const nextItems = [...items];
    nextItems.splice(index, 1);
    return {
      ...data,
      items: nextItems,
      totalCount: Math.max((data.totalCount ?? 1) - 1, 0),
    };
  }

  if (index >= 0) {
    const nextItems = [...items];
    nextItems[index] = { ...nextItems[index], ...report };
    return {
      ...data,
      items: nextItems,
    };
  }

  if (page !== 1) return data;

  const nextItems = [report, ...items].slice(0, pageSize);
  return {
    ...data,
    items: nextItems,
    totalCount: (data.totalCount ?? 0) + 1,
  };
};

export const useModerationRealtime = (enabled) => {
  const queryClient = useQueryClient();
  const refetchTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const connection = getNotificationHubConnection();

    const handleReportUpdated = (report) => {
      const entries = queryClient.getQueriesData({ queryKey: ['moderation', 'reports'] });
      entries.forEach(([key, data]) => {
        const queryParams = Array.isArray(key) ? key[2] : undefined;
        const nextData = updateReportsCache(data, queryParams, report);
        if (nextData !== data) {
          queryClient.setQueryData(key, nextData);
        }
      });
    };

    const handleAssignmentUpdated = (payload) => {
      const entries = queryClient.getQueriesData({ queryKey: ['moderation', 'assignments'] });
      entries.forEach(([key, data]) => {
        const queryParams = Array.isArray(key) ? key[2] : undefined;
        const nextData = updateAssignmentsCache(data, queryParams, payload);
        if (nextData !== data) {
          queryClient.setQueryData(key, nextData);
        }
      });
    };

    connection.off('ReportUpdated', handleReportUpdated);
    connection.off('AssignmentUpdated', handleAssignmentUpdated);
    connection.on('ReportUpdated', handleReportUpdated);
    connection.on('AssignmentUpdated', handleAssignmentUpdated);

    const unsubscribe = subscribeToNotificationHubStatus((state) => {
      if (state === 'disconnected' || state === 'reconnecting') {
        if (refetchTimerRef.current) return;
        refetchTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] });
          queryClient.invalidateQueries({ queryKey: ['moderation', 'assignments'] });
          refetchTimerRef.current = null;
        }, 2000);
      }
    });

    startNotificationHub().catch((error) => {
      console.error('SignalR connection failed:', error);
    });

    return () => {
      connection.off('ReportUpdated', handleReportUpdated);
      connection.off('AssignmentUpdated', handleAssignmentUpdated);
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
      unsubscribe();
    };
  }, [enabled, queryClient]);
};
