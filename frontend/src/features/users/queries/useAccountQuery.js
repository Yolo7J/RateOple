import { useQueryResource } from '../../../hooks/useQueryResource';
import userService from '../services/userService';

export const useAccountQuery = () => {
  return useQueryResource({
    queryKey: ['users', 'account'],
    queryFn: async () => {
      const [ratings, reviews, statuses, genres] = await Promise.all([
        userService.getMyRatings(),
        userService.getMyReviews(),
        userService.getMyStatuses(),
        userService.getMyFavoriteGenres(),
      ]);

      return {
        ratings: Array.isArray(ratings) ? ratings : [],
        reviews: Array.isArray(reviews) ? reviews : [],
        statuses: Array.isArray(statuses) ? statuses : [],
        genres: Array.isArray(genres) ? genres : [],
      };
    },
    enabled: true,
    initialData: { ratings: [], reviews: [], statuses: [], genres: [] },
  });
};
