import { useQueryResource } from '../../../shared/utils/useQueryResource';
import collectionService from '../services/collectionService';

export const useCollectionDetailsQuery = (collectionId) => {
  return useQueryResource({
    queryKey: ['collections', 'detail', collectionId],
    queryFn: () => collectionService.getById(collectionId),
    enabled: Boolean(collectionId),
    initialData: null,
  });
};
