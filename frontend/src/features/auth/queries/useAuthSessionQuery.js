import { useQueryResource } from '../../../shared/utils/useQueryResource';
import { authService } from '../services/authService';

export const useAuthSessionQuery = () => {
  return useQueryResource({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      try {
        return await authService.me();
      } catch {
        try {
          return await authService.refresh();
        } catch {
          return null;
        }
      }
    },
    enabled: true,
    initialData: null,
  });
};
