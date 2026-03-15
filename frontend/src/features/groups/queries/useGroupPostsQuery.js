import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupPostsQuery = (groupId, params = {}) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };

  return useQueryResource({
    queryKey: ['groups', 'posts', groupId, queryParams],
    queryFn: () => groupService.getPosts(groupId, queryParams),
    enabled: Boolean(groupId),
    initialData: { items: [], totalCount: 0, page: queryParams.page, pageSize: queryParams.pageSize },
  });
};
