import api from "../../../shared/api/apiClient";

export const authService = {
  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  },

  async login(email, password, captchaToken) {
    const response = await api.post("/auth/login", { email, password, captchaToken });
    return response.data; // { id, userName, roles }
  },

  async register({ email, username, password, captchaToken }) {
    await api.post("/auth/register", { email, username, password, captchaToken });
  },

  async captchaConfig() {
    const response = await api.get("/auth/captcha-config");
    return response.data;
  },

  async confirmEmail({ email, token }) {
    const response = await api.post("/auth/confirm-email", { email, token });
    return response.data;
  },

  async resendConfirmation(email) {
    const response = await api.post("/auth/resend-confirmation", { email });
    return response.data;
  },

  async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  async resetPassword({ email, token, newPassword }) {
    const response = await api.post("/auth/reset-password", { email, token, newPassword });
    return response.data;
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

export const isCaptchaRequiredError = (error) => {
  const data = error?.response?.data;
  return error?.response?.status === 403
    && (data?.requiresCaptcha === true || data?.code === 'captcha_required');
};
