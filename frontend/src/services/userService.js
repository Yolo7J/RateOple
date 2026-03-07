import api from './api';

const userService = {
    getMyRatings: async () => {
        const response = await api.get('/users/me/ratings');
        return response.data;
    },

    getMyReviews: async () => {
        const response = await api.get('/users/me/reviews');
        return response.data;
    },

    getMyStatuses: async () => {
        const response = await api.get('/users/me/status');
        return response.data;
    },

    getMyFavoriteGenres: async () => {
        const response = await api.get('/users/me/favorite-genres');
        return response.data;
    },
};

export default userService;
