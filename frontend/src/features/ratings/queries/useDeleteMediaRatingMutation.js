import { useMutation, useQueryClient } from '@tanstack/react-query';
import ratingService from '../services/ratingService';

export const useDeleteMediaRatingMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (mediaId) => ratingService.deleteMediaRating(mediaId),
    onSuccess: (_data, mediaId) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', mediaId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['media', 'detail', mediaId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    },
  });

  return {
    mutate: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error,
  };
};
