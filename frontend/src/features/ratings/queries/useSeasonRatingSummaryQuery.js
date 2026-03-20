import { useQueryResource } from '../../../hooks/useQueryResource';
import ratingService from '../services/ratingService';

export const useSeasonRatingSummaryQuery = (seasonId, enabled = true) => {
  return useQueryResource({
    queryKey: ['ratings', 'summary', 'season', seasonId],
    queryFn: () => ratingService.getSeasonSummary(seasonId),
    enabled: Boolean(seasonId) && enabled,
    initialData: null,
  });
};
