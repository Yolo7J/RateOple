import { useQueryResource } from '../../../hooks/useQueryResource';
import ratingService from '../services/ratingService';

export const useMediaRatingSummaryQuery = (mediaId) => {
  return useQueryResource({
    queryKey: ['ratings', 'summary', mediaId],
    queryFn: () => ratingService.getMediaSummary(mediaId),
    enabled: Boolean(mediaId),
    initialData: null,
  });
};
