import { useQueryResource } from '../../../hooks/useQueryResource';
import reviewService from '../services/reviewService';

export const useReviewsQuery = (mediaId, options = {}) => {
  const target = options.target ?? 'all';

  return useQueryResource({
    queryKey: ['reviews', 'media', mediaId, target],
    queryFn: () => reviewService.getMediaReviews(mediaId, { target }),
    enabled: Boolean(mediaId),
    initialData: [],
  });
};

export const useSeasonReviewsQuery = (seasonId) => {
  return useQueryResource({
    queryKey: ['reviews', 'season', seasonId],
    queryFn: () => reviewService.getSeasonReviews(seasonId),
    enabled: Boolean(seasonId),
    initialData: [],
  });
};

export const useEpisodeReviewsQuery = (episodeId) => {
  return useQueryResource({
    queryKey: ['reviews', 'episode', episodeId],
    queryFn: () => reviewService.getEpisodeReviews(episodeId),
    enabled: Boolean(episodeId),
    initialData: [],
  });
};
