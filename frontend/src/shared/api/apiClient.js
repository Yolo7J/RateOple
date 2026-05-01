import axios from 'axios';
import { registerAuthInterceptor } from './authInterceptor';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5113/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

registerAuthInterceptor(apiClient);

export default apiClient;
