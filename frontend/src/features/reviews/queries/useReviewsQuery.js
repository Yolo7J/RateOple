import { useQueryResource } from '../../../shared/utils/useQueryResource';
import reviewService from '../services/reviewService';

export const useReviewsQuery = (mediaId) => {
  return useQueryResource({
    queryKey: ['reviews', 'media', mediaId],
    queryFn: () => reviewService.getMediaReviews(mediaId),
    enabled: Boolean(mediaId),
    initialData: [],
  });
};
