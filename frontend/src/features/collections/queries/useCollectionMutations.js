import { useMutation, useQueryClient } from '@tanstack/react-query';
import collectionService from '../services/collectionService';

export const useCollectionMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCollections = (collectionId = null) => {
    queryClient.invalidateQueries({ queryKey: ['collections', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['collections', 'containing-media'] });
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

  const removeItemMutation = useMutation({
    mutationFn: ({ collectionId, mediaId }) => collectionService.removeItem(collectionId, mediaId),
    onSuccess: (collection) => {
      invalidateCollections(collection?.id ?? null);
    },
  });

  const reorderItemsMutation = useMutation({
    mutationFn: ({ collectionId, mediaIds }) => collectionService.reorderItems(collectionId, mediaIds),
    onSuccess: (collection) => {
      invalidateCollections(collection?.id ?? null);
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: ({ collectionId, payload }) => collectionService.update(collectionId, payload),
    onSuccess: (collection) => {
      invalidateCollections(collection?.id ?? null);
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId) => collectionService.delete(collectionId),
    onSuccess: (_data, collectionId) => {
      invalidateCollections(collectionId);
      queryClient.removeQueries({ queryKey: ['collections', 'detail', collectionId], exact: true });
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
    removeItemFromCollection: (collectionId, mediaId) =>
      removeItemMutation.mutateAsync({ collectionId, mediaId }),
    reorderCollectionItems: (collectionId, mediaIds) =>
      reorderItemsMutation.mutateAsync({ collectionId, mediaIds }),
    updateCollection: (collectionId, payload) =>
      updateCollectionMutation.mutateAsync({ collectionId, payload }),
    deleteCollection: deleteCollectionMutation.mutateAsync,
    followCollection: followMutation.mutateAsync,
    unfollowCollection: unfollowMutation.mutateAsync,
    loading:
      createMutation.isPending ||
      addItemMutation.isPending ||
      removeItemMutation.isPending ||
      reorderItemsMutation.isPending ||
      updateCollectionMutation.isPending ||
      deleteCollectionMutation.isPending ||
      followMutation.isPending ||
      unfollowMutation.isPending,
    error:
      createMutation.error ||
      addItemMutation.error ||
      removeItemMutation.error ||
      reorderItemsMutation.error ||
      updateCollectionMutation.error ||
      deleteCollectionMutation.error ||
      followMutation.error ||
      unfollowMutation.error,
  };
};
