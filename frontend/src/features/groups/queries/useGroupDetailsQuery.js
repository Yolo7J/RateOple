import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupDetailsQuery = (groupId) => {
  return useQueryResource({
    queryKey: ['groups', 'detail', groupId],
    queryFn: () => groupService.getGroupById(groupId),
    enabled: Boolean(groupId),
    initialData: null,
  });
};
