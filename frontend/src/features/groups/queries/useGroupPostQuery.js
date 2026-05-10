import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupPostQuery = (groupId, postId) => {
  return useQueryResource({
    queryKey: ['groups', 'post', groupId, postId],
    queryFn: () => groupService.getPostById(groupId, postId),
    enabled: Boolean(groupId && postId),
  });
};
