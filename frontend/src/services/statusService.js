import api from '../shared/api/apiClient';

const statusService = {
    setMediaStatus: async (mediaId, status) => {
        const response = await api.post(`/media/${mediaId}/status`, { status });
        return response.data;
    },

    getMyStatuses: async () => {
        const response = await api.get('/users/me/status');
        return response.data;
    },
};

export default statusService;
