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
      queryClient.invalidateQueries({ queryKey: ['groups', 'members', groupId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['groups', 'staff', groupId], exact: true });
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

  const votePostMutation = useMutation({
    mutationFn: ({ groupId, postId, value }) => groupService.votePost(groupId, postId, value),
    onSuccess: (post, vars) => {
      invalidateGroup(post?.groupId ?? vars.groupId);
      queryClient.invalidateQueries({ queryKey: ['groups', 'post', vars.groupId, vars.postId] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: ({ groupId, postId, payload }) => groupService.createPostComment(groupId, postId, payload),
    onSuccess: (_data, vars) => {
      invalidateGroup(vars.groupId);
      queryClient.invalidateQueries({ queryKey: ['groups', 'post-comments', vars.groupId, vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'post', vars.groupId, vars.postId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ groupId, postId, commentId }) => groupService.deletePostComment(groupId, postId, commentId),
    onSuccess: (_data, vars) => {
      invalidateGroup(vars.groupId);
      queryClient.invalidateQueries({ queryKey: ['groups', 'post-comments', vars.groupId, vars.postId] });
      queryClient.invalidateQueries({ queryKey: ['groups', 'post', vars.groupId, vars.postId] });
    },
  });

  const setMemberRoleMutation = useMutation({
    mutationFn: ({ groupId, userId, role }) => groupService.setMemberRole(groupId, userId, role),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: ({ groupId, newOwnerId }) => groupService.transferOwnership(groupId, newOwnerId),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  const banUserMutation = useMutation({
    mutationFn: ({ groupId, payload }) => groupService.banUser(groupId, payload),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  const unbanUserMutation = useMutation({
    mutationFn: ({ groupId, userId }) => groupService.unbanUser(groupId, userId),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  const createStaffMessageMutation = useMutation({
    mutationFn: ({ groupId, payload }) => groupService.createStaffMessage(groupId, payload),
    onSuccess: (_data, vars) => invalidateGroup(vars.groupId),
  });

  return {
    createGroup: createGroupMutation.mutateAsync,
    joinGroup: joinGroupMutation.mutateAsync,
    leaveGroup: leaveGroupMutation.mutateAsync,
    createPost: (groupId, payload) => createPostMutation.mutateAsync({ groupId, payload }),
    addPinnedMedia: (groupId, mediaId) => addPinnedMediaMutation.mutateAsync({ groupId, mediaId }),
    votePost: (groupId, postId, value) => votePostMutation.mutateAsync({ groupId, postId, value }),
    createPostComment: (groupId, postId, payload) => createCommentMutation.mutateAsync({ groupId, postId, payload }),
    deletePostComment: (groupId, postId, commentId) =>
      deleteCommentMutation.mutateAsync({ groupId, postId, commentId }),
    setMemberRole: (groupId, userId, role) => setMemberRoleMutation.mutateAsync({ groupId, userId, role }),
    transferOwnership: (groupId, newOwnerId) => transferOwnershipMutation.mutateAsync({ groupId, newOwnerId }),
    banUser: (groupId, payload) => banUserMutation.mutateAsync({ groupId, payload }),
    unbanUser: (groupId, userId) => unbanUserMutation.mutateAsync({ groupId, userId }),
    createStaffMessage: (groupId, payload) => createStaffMessageMutation.mutateAsync({ groupId, payload }),
    loading:
      createGroupMutation.isPending ||
      joinGroupMutation.isPending ||
      leaveGroupMutation.isPending ||
      createPostMutation.isPending ||
      addPinnedMediaMutation.isPending ||
      votePostMutation.isPending ||
      createCommentMutation.isPending ||
      deleteCommentMutation.isPending ||
      setMemberRoleMutation.isPending ||
      transferOwnershipMutation.isPending ||
      banUserMutation.isPending ||
      unbanUserMutation.isPending ||
      createStaffMessageMutation.isPending,
    error:
      createGroupMutation.error ||
      joinGroupMutation.error ||
      leaveGroupMutation.error ||
      createPostMutation.error ||
      addPinnedMediaMutation.error ||
      votePostMutation.error ||
      createCommentMutation.error ||
      deleteCommentMutation.error ||
      setMemberRoleMutation.error ||
      transferOwnershipMutation.error ||
      banUserMutation.error ||
      unbanUserMutation.error ||
      createStaffMessageMutation.error,
  };
};
