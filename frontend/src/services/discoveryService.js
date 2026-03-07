import api from './api';

const discoveryService = {
    getTrending: async (limit = 20) => {
        const response = await api.get('/discovery/trending', { params: { limit } });
        return response.data;
    },

    getPopular: async (limit = 40) => {
        const response = await api.get('/discovery/popular', { params: { limit } });
        return response.data;
    },

    getRecommended: async (limit = 20) => {
        const response = await api.get('/discovery/recommended', { params: { limit } });
        return response.data;
    },

    getSimilar: async (mediaId, limit = 20) => {
        const response = await api.get(`/media/${mediaId}/similar`, { params: { limit } });
        return response.data;
    },
};

export default discoveryService;
