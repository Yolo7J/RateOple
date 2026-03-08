import { useQueryResource } from '../../../shared/utils/useQueryResource';
import moderationService from '../services/moderationService';

export const useModerationReportsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 30,
    ...(params.status ? { status: params.status } : {}),
  };

  return useQueryResource({
    queryKey: ['moderation', 'reports', queryParams],
    queryFn: () => moderationService.getReports(queryParams),
    enabled,
    initialData: {
      items: [],
      totalCount: 0,
      page: queryParams.page,
      pageSize: queryParams.pageSize,
    },
  });
};
