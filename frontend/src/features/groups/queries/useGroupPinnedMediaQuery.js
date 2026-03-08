import { useQueryResource } from '../../../shared/utils/useQueryResource';
import groupService from '../services/groupService';

export const useGroupPinnedMediaQuery = (groupId) => {
  return useQueryResource({
    queryKey: ['groups', 'pinned-media', groupId],
    queryFn: () => groupService.getPinnedMedia(groupId),
    enabled: Boolean(groupId),
    initialData: [],
  });
};
