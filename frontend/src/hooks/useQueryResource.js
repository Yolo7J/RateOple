import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../shared/api/queryClient';

export const invalidateQuery = (queryKey) => {
  queryClient.removeQueries({ queryKey, exact: true });
};

export const useQueryResource = ({ queryKey, queryFn, enabled = true, initialData = null }) => {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    initialData: initialData ?? undefined,
  });

  return {
    data: query.data ?? initialData,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};
