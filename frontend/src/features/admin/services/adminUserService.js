import api from '../../../shared/api/apiClient';

const adminUserService = {
  searchUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  grantAdmin: async (userId) => {
    await api.post(`/admin/users/${userId}/roles/admin`, {});
  },

  revokeAdmin: async (userId) => {
    await api.delete(`/admin/users/${userId}/roles/admin`);
  },

  grantModerator: async (userId) => {
    await api.post(`/admin/users/${userId}/roles/moderator`, {});
  },

  revokeModerator: async (userId) => {
    await api.delete(`/admin/users/${userId}/roles/moderator`);
  },
};

export default adminUserService;
