import api from './api';

const ratingService = {
    // Get rating summary for a media item
    getSummary: async (mediaId) => {
        try {
            const response = await api.get(`/media/${mediaId}/ratings/summary`);
            return response.data;
        } catch (error) {
            console.error('Error fetching rating summary:', error);
            throw error;
        }
    },

    // Rate a media item (1-10)
    rateMedia: async (mediaId, value) => {
        try {
            const response = await api.post(`/media/${mediaId}/ratings`, { value }, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data;
        } catch (error) {
            console.error('Error rating media:', error);
            throw error;
        }
    },

    // Delete a user's rating for a media item
    deleteRating: async (mediaId) => {
        try {
            await api.delete(`/media/${mediaId}/ratings`);
        } catch (error) {
            console.error('Error deleting rating:', error);
            throw error;
        }
    },

    // Get all ratings for a user
    getUserRatings: async (userId) => {
        try {
            const response = await api.get(`/users/${userId}/ratings`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user ratings:', error);
            throw error;
        }
    }
};

export default ratingService;
