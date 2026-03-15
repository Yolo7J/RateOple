import { useQueryResource } from '../../../hooks/useQueryResource';
import * as mediaService from '../services/mediaService';

export const useMediaGenresQuery = () => {
  return useQueryResource({
    queryKey: ['media', 'genres'],
    queryFn: () => mediaService.getGenres(),
    enabled: true,
    initialData: [],
  });
};
