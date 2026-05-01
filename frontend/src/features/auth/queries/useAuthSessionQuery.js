import { useQueryResource } from '../../../hooks/useQueryResource';
import { loadAuthSession } from '../services/authService';

export const useAuthSessionQuery = () => {
  return useQueryResource({
    queryKey: ['auth', 'session'],
    queryFn: loadAuthSession,
    enabled: true,
    initialData: null,
  });
};
