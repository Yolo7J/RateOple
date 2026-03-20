import { useMutation, useQueryClient } from '@tanstack/react-query';
import ratingService from '../services/ratingService';

export const useRateSeasonMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ seasonId, value }) => ratingService.rateSeason(seasonId, value),
    onSuccess: (_data, variables) => {
      const { seasonId } = variables;
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', 'season', seasonId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    },
  });

  const mutate = async (seasonId, value) => {
    return await mutation.mutateAsync({ seasonId, value });
  };

  return { mutate, loading: mutation.isPending, error: mutation.error };
};
