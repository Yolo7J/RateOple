import { useQuery } from '@tanstack/react-query';
import groupService from '../services/groupService';

export const useGroupStaffMessagesQuery = (groupId, enabled = true) => {
  return useQuery({
    queryKey: ['groups', 'staff', groupId],
    queryFn: () => groupService.getStaffMessages(groupId),
    enabled: Boolean(groupId) && enabled,
  });
};
