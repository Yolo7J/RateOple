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

  update: async (collectionId, payload) => {
    const response = await api.put(`/collections/${collectionId}`, payload);
    return response.data;
  },

  addItem: async (collectionId, mediaId, orderIndex = null) => {
    const response = await api.post(`/collections/${collectionId}/items`, {
      mediaId,
      orderIndex,
    });
    return response.data;
  },

  removeItem: async (collectionId, mediaId) => {
    const response = await api.delete(`/collections/${collectionId}/items/${mediaId}`);
    return response.data;
  },

  reorderItems: async (collectionId, mediaIds) => {
    const response = await api.put(`/collections/${collectionId}/items/reorder`, {
      mediaIds,
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
