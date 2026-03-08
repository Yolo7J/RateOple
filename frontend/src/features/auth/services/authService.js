import api from "../../../shared/api/apiClient";

export const authService = {
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
    await api.post("/auth/refresh");
  },
};