import { useQueryResource } from '../../../hooks/useQueryResource';
import discoveryService from '../services/discoveryService';

export const useSimilarMediaQuery = (mediaId, limit = 20) => {
  return useQueryResource({
    queryKey: ['discovery', 'similar', mediaId, limit],
    queryFn: () => discoveryService.getSimilar(mediaId, limit),
    enabled: Boolean(mediaId),
    initialData: [],
  });
};
