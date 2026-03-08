import api from '../../../shared/api/apiClient';

const userProfileService = {
  getProfile: async () => {
    const response = await api.get('/users/me/profile');
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await api.put('/users/me/profile', payload);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    await api.post('/users/me/change-password', { currentPassword, newPassword });
  },

  deleteAccount: async (currentPassword) => {
    await api.delete('/users/me', { data: { currentPassword } });
  },
};

export default userProfileService;
