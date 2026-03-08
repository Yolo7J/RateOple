import { useMutation, useQueryClient } from '@tanstack/react-query';
import groupService from '../services/groupService';

export const useGroupMutations = () => {
  const queryClient = useQueryClient();

  const invalidateGroup = (groupId = null) => {
    queryClient.invalidateQueries({ queryKey: ['groups', 'list'] });
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['groups', 'posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'pinned-media', groupId], exact: true });
    }
  };

  const createGroupMutation = useMutation({
    mutationFn: (payload) => groupService.createGroup(payload),
    onSuccess: (group) => invalidateGroup(group?.id ?? null),
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId) => groupService.joinGroup(groupId),
    onSuccess: (_data, groupId) => invalidateGroup(groupId),
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId) => groupService.leaveGroup(groupId),
    onSuccess: (_data, groupId) => invalidateGroup(groupId),
  });

  const createPostMutation = useMutation({
    mutationFn: ({ groupId, payload }) => groupService.createPost(groupId, payload),
    onSuccess: (post) => invalidateGroup(post?.groupId ?? null),
  });

  const addPinnedMediaMutation = useMutation({
    mutationFn: ({ groupId, mediaId }) => groupService.addPinnedMedia(groupId, mediaId),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  return {
    createGroup: createGroupMutation.mutateAsync,
    joinGroup: joinGroupMutation.mutateAsync,
    leaveGroup: leaveGroupMutation.mutateAsync,
    createPost: (groupId, payload) => createPostMutation.mutateAsync({ groupId, payload }),
    addPinnedMedia: (groupId, mediaId) => addPinnedMediaMutation.mutateAsync({ groupId, mediaId }),
    loading:
      createGroupMutation.isPending ||
      joinGroupMutation.isPending ||
      leaveGroupMutation.isPending ||
      createPostMutation.isPending ||
      addPinnedMediaMutation.isPending,
    error:
      createGroupMutation.error ||
      joinGroupMutation.error ||
      leaveGroupMutation.error ||
      createPostMutation.error ||
      addPinnedMediaMutation.error,
  };
};
