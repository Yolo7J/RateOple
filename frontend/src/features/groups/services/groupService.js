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

  createPost: async (groupId, payload) => {
    const response = await api.post(`/groups/${groupId}/posts`, payload);
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
