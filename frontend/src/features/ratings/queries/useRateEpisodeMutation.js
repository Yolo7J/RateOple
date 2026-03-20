import { useMutation, useQueryClient } from '@tanstack/react-query';
import ratingService from '../services/ratingService';

export const useRateEpisodeMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ episodeId, value }) => ratingService.rateEpisode(episodeId, value),
    onSuccess: (_data, variables) => {
      const { episodeId } = variables;
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', 'episode', episodeId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    },
  });

  const mutate = async (episodeId, value) => {
    return await mutation.mutateAsync({ episodeId, value });
  };

  return { mutate, loading: mutation.isPending, error: mutation.error };
};
