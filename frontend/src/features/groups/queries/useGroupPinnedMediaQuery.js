import { useQueryResource } from '../../../hooks/useQueryResource';
import groupService from '../services/groupService';

export const useGroupPinnedMediaQuery = (groupId) => {
  return useQueryResource({
    queryKey: ['groups', 'pinned-media', groupId],
    queryFn: () => groupService.getPinnedMedia(groupId),
    enabled: Boolean(groupId),
    initialData: [],
  });
};
