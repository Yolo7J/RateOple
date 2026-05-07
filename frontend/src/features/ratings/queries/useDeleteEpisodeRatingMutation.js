import { useMutation, useQueryClient } from '@tanstack/react-query';
import ratingService from '../services/ratingService';

export const useDeleteEpisodeRatingMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (episodeId) => ratingService.deleteEpisodeRating(episodeId),
    onSuccess: (_data, episodeId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', 'episode', episodeId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    },
  });

  return {
    mutate: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  };
};
