import { useQueryResource } from '../../../hooks/useQueryResource';
import moderationService from '../services/moderationService';

export const useModeratorAssignmentsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    ...(params.scopeType ? { scopeType: params.scopeType } : {}),
    ...(params.scopeId ? { scopeId: params.scopeId } : {}),
  };

  return useQueryResource({
    queryKey: ['moderation', 'assignments', queryParams],
    queryFn: () => moderationService.getAssignments(queryParams),
    enabled,
    initialData: [],
  });
};
