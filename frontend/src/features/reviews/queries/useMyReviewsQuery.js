import { useQueryResource } from '../../../hooks/useQueryResource';
import reviewService from '../services/reviewService';

export const useMyReviewsQuery = (enabled = true) => {
  return useQueryResource({
    queryKey: ['reviews', 'me'],
    queryFn: () => reviewService.getMyReviews(),
    enabled,
    initialData: [],
  });
};
