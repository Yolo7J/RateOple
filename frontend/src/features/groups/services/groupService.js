import api from '../../../shared/api/apiClient';

const groupService = {
  listGroups: async (params = {}) => {
    const response = await api.get('/groups', { params });
    return response.data;
  },

  getGroupById: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  createGroup: async (payload) => {
    const response = await api.post('/groups', payload);
    return response.data;
  },

  joinGroup: async (groupId) => {
    await api.post(`/groups/${groupId}/join`);
  },

  leaveGroup: async (groupId) => {
    await api.delete(`/groups/${groupId}/leave`);
  },

  getPosts: async (groupId, params = {}) => {
    const response = await api.get(`/groups/${groupId}/posts`, { params });
    return response.data;
  },

  getPostById: async (groupId, postId) => {
    const response = await api.get(`/groups/${groupId}/posts/${postId}`);
    return response.data;
  },

  createPost: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/posts`, payload);
    return response.data;
  },

  votePost: async (groupId, postId, value) => {
    const response = await api.post(`/groups/${groupId}/posts/${postId}/vote`, { value });
    return response.data;
  },

  getPostComments: async (groupId, postId) => {
    const response = await api.get(`/groups/${groupId}/posts/${postId}/comments`);
    return response.data;
  },

  createPostComment: async (groupId, postId, payload) => {
    const response = await api.post(`/groups/${groupId}/posts/${postId}/comments`, payload);
    return response.data;
  },

  deletePostComment: async (groupId, postId, commentId) => {
    await api.delete(`/groups/${groupId}/posts/${postId}/comments/${commentId}`);
  },

  getMembers: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/members`);
    return response.data;
  },

  setMemberRole: async (groupId, userId, role) => {
    await api.post(`/groups/${groupId}/members/${userId}/role`, { role });
  },

  transferOwnership: async (groupId, newOwnerId) => {
    await api.post(`/groups/${groupId}/ownership`, { newOwnerId });
  },

  banUser: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/bans`, payload);
    return response.data;
  },

  unbanUser: async (groupId, userId) => {
    await api.delete(`/groups/${groupId}/bans/${userId}`);
  },

  getStaffMessages: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/staff/messages`);
    return response.data;
  },

  createStaffMessage: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/staff/messages`, payload);
    return response.data;
  },

  getPinnedMedia: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/pinned-media`);
    return response.data;
  },

  addPinnedMedia: async (groupId, mediaId) => {
    await api.post(`/groups/${groupId}/pinned-media`, { mediaId });
  },
};

export default groupService;
