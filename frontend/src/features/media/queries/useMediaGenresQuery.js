import { useQueryResource } from '../../../shared/utils/useQueryResource';
import * as mediaService from '../services/mediaService';

export const useMediaGenresQuery = () => {
  return useQueryResource({
    queryKey: ['media', 'genres'],
    queryFn: () => mediaService.getGenres(),
    enabled: true,
    initialData: [],
  });
};
