import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupPostCommentsQuery = (groupId, postId) => {
  return useQueryResource({
    queryKey: ['groups', 'post-comments', groupId, postId],
    queryFn: () => groupService.getPostComments(groupId, postId),
    enabled: Boolean(groupId && postId),
  });
};
