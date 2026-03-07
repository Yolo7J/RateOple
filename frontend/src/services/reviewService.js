import api from './api';

const reviewService = {
    getMediaReviews: async (mediaId) => {
        const response = await api.get(`/media/${mediaId}/reviews`);
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
