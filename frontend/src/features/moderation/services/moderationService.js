import api from '../../../shared/api/apiClient';

const moderationService = {
  createReport: async (payload) => {
    const response = await api.post('/moderation/reports', payload);
    return response.data;
  },

  getReports: async (params = {}) => {
    const response = await api.get('/moderation/reports', { params });
    return response.data;
  },

  updateReportStatus: async (reportId, status) => {
    const response = await api.put(`/moderation/reports/${reportId}/status`, { status });
    return response.data;
  },

  createAssignment: async (payload) => {
    const response = await api.post('/moderation/assignments', payload);
    return response.data;
  },

  getAssignments: async (params = {}) => {
    const response = await api.get('/moderation/assignments', { params });
    return response.data;
  },

  removeAssignment: async ({ userId, scopeType, scopeId = null }) => {
    await api.delete('/moderation/assignments', {
      params: {
        userId,
        scopeType,
        ...(scopeId ? { scopeId } : {}),
      },
    });
  },
};

export default moderationService;
