import { useQueryResource } from '../../../hooks/useQueryResource';
import notificationService from '../services/notificationService';

export const useNotificationsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 30,
    ...(params.unreadOnly ? { unreadOnly: true } : {}),
  };

  return useQueryResource({
    queryKey: ['notifications', 'list', queryParams],
    queryFn: () => notificationService.list(queryParams),
    enabled,
    initialData: { items: [], totalCount: 0, page: queryParams.page, pageSize: queryParams.pageSize },
  });
};
