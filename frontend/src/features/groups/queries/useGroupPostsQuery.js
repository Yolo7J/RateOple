import { useQueryResource } from '../../../shared/utils/useQueryResource';

export const useGroupPostsQuery = (groupId) => {
  return useQueryResource({
    queryKey: ['groups', 'posts', groupId],
    queryFn: async () => [],
    enabled: Boolean(groupId),
    initialData: [],
  });
};
