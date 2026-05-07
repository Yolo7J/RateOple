import { useMutation, useQueryClient } from '@tanstack/react-query';
import ratingService from '../services/ratingService';

export const useDeleteSeasonRatingMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (seasonId) => ratingService.deleteSeasonRating(seasonId),
    onSuccess: (_data, seasonId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', 'season', seasonId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    },
  });

  return {
    mutate: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  };
};
