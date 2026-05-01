import axios from 'axios';
import { registerAuthInterceptor } from './authInterceptor';
import { getApiBaseUrl } from './apiConfig';

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

registerAuthInterceptor(apiClient);

export default apiClient;
