import { useQueryResource } from '../../../hooks/useQueryResource';
import statusService from '../services/statusService';

export const useWatchlistQuery = () => {
  return useQueryResource({
    queryKey: ['users', 'watchlist'],
    queryFn: () => statusService.getMyStatuses(),
    enabled: true,
    initialData: [],
  });
};
