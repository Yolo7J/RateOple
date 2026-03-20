import { useQueryResource } from '../../../hooks/useQueryResource';
import ratingService from '../services/ratingService';

export const useEpisodeRatingSummaryQuery = (episodeId, enabled = true) => {
  return useQueryResource({
    queryKey: ['ratings', 'summary', 'episode', episodeId],
    queryFn: () => ratingService.getEpisodeSummary(episodeId),
    enabled: Boolean(episodeId) && enabled,
    initialData: null,
  });
};
