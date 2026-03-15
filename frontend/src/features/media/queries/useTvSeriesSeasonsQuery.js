import { useQueryResource } from '../../../hooks/useQueryResource';
import { getSeasons } from '../services/tvSeriesService';

export const useTvSeriesSeasonsQuery = (mediaId) => {
  return useQueryResource({
    queryKey: ['media', 'seasons', mediaId],
    queryFn: () => getSeasons(mediaId),
    enabled: Boolean(mediaId),
    initialData: [],
  });
};
