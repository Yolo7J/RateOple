import { useMutation, useQueryClient } from '@tanstack/react-query';
import reviewService from '../services/reviewService';

export const useReviewMutations = () => {
  const queryClient = useQueryClient();

  const invalidateReviewRelatedData = (mediaId) => {
    if (mediaId) {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'media', mediaId] });
      queryClient.invalidateQueries({ queryKey: ['media', 'detail', mediaId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'summary', mediaId], exact: true });
    }
    queryClient.invalidateQueries({ queryKey: ['users', 'account'], exact: true });
    queryClient.invalidateQueries({ queryKey: ['discovery', 'home'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => reviewService.createReview(payload),
    onSuccess: (reviewDto) => {
      invalidateReviewRelatedData(reviewDto?.mediaId);
      if (reviewDto?.seasonId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'season', reviewDto.seasonId], exact: true });
      }
      if (reviewDto?.episodeId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'episode', reviewDto.episodeId], exact: true });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, payload }) => reviewService.updateReview(reviewId, payload),
    onSuccess: (reviewDto) => {
      invalidateReviewRelatedData(reviewDto?.mediaId);
      if (reviewDto?.seasonId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'season', reviewDto.seasonId], exact: true });
      }
      if (reviewDto?.episodeId) {
        queryClient.invalidateQueries({ queryKey: ['reviews', 'episode', reviewDto.episodeId], exact: true });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ reviewId, deleteRating }) => reviewService.deleteReview(reviewId, deleteRating),
    onSuccess: (_result, variables) => {
      invalidateReviewRelatedData(variables?.mediaId);
    },
  });

  const createReview = async (payload) => createMutation.mutateAsync(payload);
  const updateReview = async (reviewId, payload) => updateMutation.mutateAsync({ reviewId, payload });
  const deleteReview = async (reviewId, mediaId, deleteRating = false) =>
    deleteMutation.mutateAsync({ reviewId, mediaId, deleteRating });

  return {
    createReview,
    updateReview,
    deleteReview,
    loading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: createMutation.error || updateMutation.error || deleteMutation.error,
  };
};
