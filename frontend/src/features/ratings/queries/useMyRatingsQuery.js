import { useQueryResource } from '../../../shared/utils/useQueryResource';
import ratingService from '../services/ratingService';

export const useMyRatingsQuery = (enabled = true) => {
  return useQueryResource({
    queryKey: ['ratings', 'me'],
    queryFn: () => ratingService.getMyRatings(),
    enabled,
    initialData: [],
  });
};
