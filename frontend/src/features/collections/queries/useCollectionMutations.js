import { useMutation, useQueryClient } from '@tanstack/react-query';
import collectionService from '../services/collectionService';

export const useCollectionMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCollections = (collectionId = null) => {
    queryClient.invalidateQueries({ queryKey: ['collections', 'list'] });
    if (collectionId) {
      queryClient.invalidateQueries({ queryKey: ['collections', 'detail', collectionId], exact: true });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload) => collectionService.create(payload),
    onSuccess: (collection) => {
      invalidateCollections(collection?.id ?? null);
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ collectionId, mediaId, orderIndex }) =>
      collectionService.addItem(collectionId, mediaId, orderIndex),
    onSuccess: (collection) => {
      invalidateCollections(collection?.id ?? null);
    },
  });

  const followMutation = useMutation({
    mutationFn: (collectionId) => collectionService.follow(collectionId),
    onSuccess: (_data, collectionId) => {
      invalidateCollections(collectionId);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (collectionId) => collectionService.unfollow(collectionId),
    onSuccess: (_data, collectionId) => {
      invalidateCollections(collectionId);
    },
  });

  return {
    createCollection: createMutation.mutateAsync,
    addItemToCollection: (collectionId, mediaId, orderIndex = null) =>
      addItemMutation.mutateAsync({ collectionId, mediaId, orderIndex }),
    followCollection: followMutation.mutateAsync,
    unfollowCollection: unfollowMutation.mutateAsync,
    loading:
      createMutation.isPending ||
      addItemMutation.isPending ||
      followMutation.isPending ||
      unfollowMutation.isPending,
    error:
      createMutation.error ||
      addItemMutation.error ||
      followMutation.error ||
      unfollowMutation.error,
  };
};
