import { useQueryResource } from '../../../shared/utils/useQueryResource';
import { getMediaById } from '../services/mediaService';

export const useMediaDetailsQuery = (mediaId) => {
  return useQueryResource({
    queryKey: ['media', 'detail', mediaId],
    queryFn: () => getMediaById(mediaId),
    enabled: Boolean(mediaId),
    initialData: null,
  });
};
