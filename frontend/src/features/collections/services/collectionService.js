import api from '../../../shared/api/apiClient';

const collectionService = {
  query: async (params = {}) => {
    const response = await api.get('/collections', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/collections/${id}`);
    return response.data;
  },

  create: async (payload) => {
    const response = await api.post('/collections', payload);
    return response.data;
  },

  addItem: async (collectionId, mediaId, orderIndex = null) => {
    const response = await api.post(`/collections/${collectionId}/items`, {
      mediaId,
      orderIndex,
    });
    return response.data;
  },

  follow: async (collectionId) => {
    await api.post(`/collections/${collectionId}/follow`);
  },

  unfollow: async (collectionId) => {
    await api.delete(`/collections/${collectionId}/follow`);
  },
};

export default collectionService;
