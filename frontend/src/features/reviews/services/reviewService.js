import api from '../../../shared/api/apiClient';

const reviewService = {
    getMediaReviews: async (mediaId, options = {}) => {
        const response = await api.get(`/media/${mediaId}/reviews`, {
            params: { target: options.target },
        });
        return response.data;
    },

    getSeasonReviews: async (seasonId) => {
        const response = await api.get(`/seasons/${seasonId}/reviews`);
        return response.data;
    },

    getEpisodeReviews: async (episodeId) => {
        const response = await api.get(`/episodes/${episodeId}/reviews`);
        return response.data;
    },

    createReview: async (payload) => {
        const response = await api.post('/reviews', payload);
        return response.data;
    },

    updateReview: async (reviewId, payload) => {
        const response = await api.put(`/reviews/${reviewId}`, payload);
        return response.data;
    },

    deleteReview: async (reviewId, deleteRating = false) => {
        await api.delete(`/reviews/${reviewId}`, { params: { deleteRating } });
    },

    getMyReviews: async () => {
        const response = await api.get('/users/me/reviews');
        return response.data;
    },
};

export default reviewService;
