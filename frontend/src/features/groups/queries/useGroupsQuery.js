import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    ...(params.search ? { search: params.search } : {}),
    ...(params.visibility ? { visibility: params.visibility } : {}),
  };

  return useQueryResource({
    queryKey: ['groups', 'list', queryParams],
    queryFn: () => groupService.listGroups(queryParams),
    enabled,
  });
};
