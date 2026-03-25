import { useQueryResource } from '../../../hooks/useQueryResource';
import moderationService from '../services/moderationService';

export const useModerationAuditLogsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 30,
    ...(params.action ? { action: params.action } : {}),
  };

  return useQueryResource({
    queryKey: ['moderation', 'audit-logs', queryParams],
    queryFn: () => moderationService.getAuditLogs(queryParams),
    enabled,
    initialData: {
      items: [],
      totalCount: 0,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    },
  });
};
