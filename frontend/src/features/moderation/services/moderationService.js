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

  updateReportStatus: async (reportId, status, note = '') => {
    const response = await api.put(`/moderation/reports/${reportId}/status`, {
      status,
      ...(note?.trim() ? { note: note.trim() } : {}),
    });
    return response.data;
  },

  removeReportTarget: async (reportId, reason = '') => {
    const response = await api.delete(`/moderation/reports/${reportId}/target`, {
      data: reason?.trim() ? { reason: reason.trim() } : {},
    });
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

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/moderation/audit-logs', { params });
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
