import { useMemo } from 'react';
import { useQueryResource } from '../../../shared/utils/useQueryResource';
import * as mediaService from '../services/mediaService';

export const useMediaListQuery = ({ types, genreIds, search, sortBy, sortDir, page, pageSize }) => {
  const params = useMemo(() => ({
    types,
    genreIds,
    search,
    sortBy,
    sortDir,
    page,
    pageSize,
  }), [types, genreIds, search, sortBy, sortDir, page, pageSize]);

  return useQueryResource({
    queryKey: ['media', 'list', params],
    queryFn: () => mediaService.getAll(params),
    enabled: true,
    initialData: { items: [], totalCount: 0, totalPages: 1 },
  });
};
