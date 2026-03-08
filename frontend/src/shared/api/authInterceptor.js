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
    headers: { Accept: 'application/json' },
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

export const registerAuthInterceptor = (apiClient) => {
  apiClient.interceptors.request.use(
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

  apiClient.interceptors.response.use(
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
        return apiClient(originalRequest);
      }

      if (status === 401) {
        console.warn('Unauthorized access');
      }

      return Promise.reject(error);
    }
  );
};
