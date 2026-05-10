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
  });
};
