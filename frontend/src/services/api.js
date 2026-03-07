import axios from 'axios';

const CSRF_HEADER = 'X-CSRF-TOKEN';
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let csrfToken = null;
let csrfTokenPromise = null;

const ensureCsrfToken = async () => {
    if (csrfToken) return csrfToken;
    if (csrfTokenPromise) return csrfTokenPromise;

    csrfTokenPromise = fetch('http://localhost:5113/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
        },
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error('Failed to obtain CSRF token.');
            }

            const data = await response.json();
            csrfToken = data?.token ?? null;
            return csrfToken;
        })
        .finally(() => {
            csrfTokenPromise = null;
        });

    return csrfTokenPromise;
};

const api = axios.create({
    baseURL: 'http://localhost:5113/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true
});

// Ensure CSRF cookie+header for mutating requests.
api.interceptors.request.use(
    async (config) => {
        const method = (config.method || 'get').toLowerCase();
        if (MUTATING_METHODS.has(method)) {
            const token = await ensureCsrfToken();
            if (token) {
                config.headers[CSRF_HEADER] = token;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        const status = error?.response?.status;
        const serverMessage = typeof error?.response?.data === 'string'
            ? error.response.data
            : error?.response?.data?.message;

        const hasCsrfFailure = status === 400 && (
            `${serverMessage || ''}`.toLowerCase().includes('antiforgery') ||
            `${serverMessage || ''}`.toLowerCase().includes('csrf')
        );

        if (hasCsrfFailure && originalRequest && !originalRequest._csrfRetried) {
            originalRequest._csrfRetried = true;
            csrfToken = null;
            const token = await ensureCsrfToken();
            if (token) {
                originalRequest.headers[CSRF_HEADER] = token;
            }
            return api(originalRequest);
        }

        // Handle 401 Unauthorized globally
        if (error.response && error.response.status === 401) {
            // transform to friendly error or redirect to login
            console.warn('Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export default api;
