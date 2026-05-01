const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:5113/api';
const LOCAL_FRONTEND_PORTS = new Set(['3000', '5173', '5174']);

const normalizeApiBaseUrl = (value) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return normalizeApiBaseUrl(configured);
  }

  if (typeof window === 'undefined') {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  const { hostname, port, origin } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isFrontendDevServer = isLocalHost && LOCAL_FRONTEND_PORTS.has(port);

  if (isFrontendDevServer) {
    return DEFAULT_LOCAL_API_BASE_URL;
  }

  return `${origin}/api`;
};

export const getBackendOrigin = () => {
  const apiBaseUrl = new URL(getApiBaseUrl(), window.location.origin);
  return apiBaseUrl.origin;
};

export const getCsrfUrl = () => `${getApiBaseUrl()}/csrf`;
