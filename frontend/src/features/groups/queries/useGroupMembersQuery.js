import { useQuery } from '@tanstack/react-query';
import groupService from '../services/groupService';

export const useGroupMembersQuery = (groupId, enabled = true) => {
  return useQuery({
    queryKey: ['groups', 'members', groupId],
    queryFn: () => groupService.getMembers(groupId),
    enabled: Boolean(groupId) && enabled,
  });
};
