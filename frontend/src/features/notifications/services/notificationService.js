import api from '../../../shared/api/apiClient';

const notificationService = {
  list: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  markRead: async (notificationId) => {
    await api.post(`/notifications/${notificationId}/read`);
  },

  markAllRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};

export default notificationService;
