import api from "../../../shared/api/apiClient";

export const authService = {
  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    return response.data; // { id, userName, roles }
  },

  async register({ email, username, password }) {
    await api.post("/auth/register", { email, username, password });
  },

  async logout() {
    await api.post("/auth/logout");
  },

  async refresh() {
    const response = await api.post("/auth/refresh");
    return response.data;
  },
};

export const loadAuthSession = async () => {
  try {
    return await authService.me();
  } catch {
    try {
      return await authService.refresh();
    } catch {
      return null;
    }
  }
};

export const getAuthErrorMessage = (error, fallback = 'Authentication failed.') => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData)) {
    const messages = responseData
      .map((item) => item?.description || item?.message || item?.title || item?.detail)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData;
  }

  if (typeof responseData?.message === 'string' && responseData.message.trim()) {
    return responseData.message;
  }

  if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
    return responseData.detail;
  }

  if (typeof responseData?.title === 'string' && responseData.title.trim()) {
    return responseData.title;
  }

  return fallback;
};
