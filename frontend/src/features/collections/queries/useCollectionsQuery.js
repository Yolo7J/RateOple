import { useQueryResource } from '../../../hooks/useQueryResource';
import collectionService from '../services/collectionService';

export const useCollectionsQuery = (params = {}, enabled = true) => {
  const queryParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 24,
    ...(params.ownerType ? { ownerType: params.ownerType } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.parentCollectionId ? { parentCollectionId: params.parentCollectionId } : {}),
  };

  return useQueryResource({
    queryKey: ['collections', 'list', queryParams],
    queryFn: () => collectionService.query(queryParams),
    enabled,
    initialData: { items: [], totalCount: 0, page: queryParams.page, pageSize: queryParams.pageSize },
  });
};
