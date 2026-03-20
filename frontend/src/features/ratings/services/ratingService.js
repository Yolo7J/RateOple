import api from '../../../shared/api/apiClient';

const ratingService = {
    getMediaSummary: async (mediaId) => {
        const response = await api.get(`/media/${mediaId}/ratings/summary`);
        return response.data;
    },
    getSeasonSummary: async (seasonId) => {
        const response = await api.get(`/seasons/${seasonId}/ratings/summary`);
        return response.data;
    },
    getEpisodeSummary: async (episodeId) => {
        const response = await api.get(`/episodes/${episodeId}/ratings/summary`);
        return response.data;
    },

    rateMedia: async (mediaId, value) => {
        const response = await api.post(`/media/${mediaId}/ratings`, { value });
        return response.data;
    },
    rateSeason: async (seasonId, value) => {
        const response = await api.post(`/seasons/${seasonId}/ratings`, { value });
        return response.data;
    },
    rateEpisode: async (episodeId, value) => {
        const response = await api.post(`/episodes/${episodeId}/ratings`, { value });
        return response.data;
    },

    deleteMediaRating: async (mediaId) => {
        await api.delete(`/media/${mediaId}/ratings`);
    },
    deleteSeasonRating: async (seasonId) => {
        await api.delete(`/seasons/${seasonId}/ratings`);
    },
    deleteEpisodeRating: async (episodeId) => {
        await api.delete(`/episodes/${episodeId}/ratings`);
    },

    getMyRatings: async () => {
        const response = await api.get('/users/me/ratings');
        return response.data;
    },
};

export default ratingService;
