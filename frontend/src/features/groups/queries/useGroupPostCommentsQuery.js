import { useQuery } from '@tanstack/react-query';
import groupService from '../services/groupService';

export const useGroupPostCommentsQuery = (groupId, postId) => {
  return useQuery({
    queryKey: ['groups', 'post-comments', groupId, postId],
    queryFn: () => groupService.getPostComments(groupId, postId),
    enabled: Boolean(groupId && postId),
  });
};
