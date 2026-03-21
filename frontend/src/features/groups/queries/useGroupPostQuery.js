import { useQuery } from '@tanstack/react-query';
import groupService from '../services/groupService';

export const useGroupPostQuery = (groupId, postId) => {
  return useQuery({
    queryKey: ['groups', 'post', groupId, postId],
    queryFn: () => groupService.getPostById(groupId, postId),
    enabled: Boolean(groupId && postId),
  });
};
