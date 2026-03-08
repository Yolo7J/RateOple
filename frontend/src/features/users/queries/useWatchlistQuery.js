import { useQueryResource } from '../../../shared/utils/useQueryResource';
import statusService from '../services/statusService';

export const useWatchlistQuery = () => {
  return useQueryResource({
    queryKey: ['users', 'watchlist'],
    queryFn: () => statusService.getMyStatuses(),
    enabled: true,
    initialData: [],
  });
};
