import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5113/api', // HTTPS profile from launchSettings
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // For Identity cookies if needed
});

// Request interceptor for auth token (if using JWT in future)
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized globally
        if (error.response && error.response.status === 401) {
            // transform to friendly error or redirect to login
            console.warn('Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export default api;
