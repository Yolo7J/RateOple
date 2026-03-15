import { useQueryResource } from '../../../hooks/useQueryResource';
import discoveryService from '../services/discoveryService';

export const useHomeDiscoveryQuery = (user) => {
  return useQueryResource({
    queryKey: ['discovery', 'home', Boolean(user)],
    queryFn: async () => {
      const [trending, popular, recommended] = await Promise.all([
        discoveryService.getTrending(24),
        discoveryService.getPopular(60),
        user ? discoveryService.getRecommended(24).catch(() => []) : Promise.resolve([]),
      ]);

      return {
        trending: Array.isArray(trending) ? trending : [],
        popular: Array.isArray(popular) ? popular : [],
        recommended: Array.isArray(recommended) ? recommended : [],
      };
    },
    enabled: true,
    initialData: { trending: [], popular: [], recommended: [] },
  });
};
