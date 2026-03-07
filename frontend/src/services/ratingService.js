import api from './api';

const ratingService = {
    getMediaSummary: async (mediaId) => {
        const response = await api.get(`/media/${mediaId}/ratings/summary`);
        return response.data;
    },

    rateMedia: async (mediaId, value) => {
        const response = await api.post(`/media/${mediaId}/ratings`, { value });
        return response.data;
    },

    deleteMediaRating: async (mediaId) => {
        await api.delete(`/media/${mediaId}/ratings`);
    },

    getMyRatings: async () => {
        const response = await api.get('/users/me/ratings');
        return response.data;
    },
};

export default ratingService;
