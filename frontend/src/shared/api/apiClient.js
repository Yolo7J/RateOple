import axios from 'axios';
import { registerAuthInterceptor } from './authInterceptor';

const apiClient = axios.create({
  baseURL: 'http://localhost:5113/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

registerAuthInterceptor(apiClient);

export default apiClient;
