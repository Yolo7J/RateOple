import { getApiBaseUrl } from '../../../shared/api/apiConfig';

const GOOGLE_LOGIN_PATH = '/auth/google/login';
const OAUTH_CALLBACK_PATH = '/auth/callback';

const ensureLeadingSlash = (value) => (value.startsWith('/') ? value : `/${value}`);

const joinUrlPath = (basePath, childPath) => {
  const normalizedBase = basePath.replace(/\/+$/, '');
  const normalizedChild = childPath.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedChild}`.replace(/\/{2,}/g, '/');
};

export const normalizeLocalReturnUrl = (value, fallback = '/') => {
  if (typeof value !== 'string' || !value.trim()) return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;

  try {
    const candidate = new URL(trimmed, window.location.origin);
    if (candidate.origin !== window.location.origin) return fallback;
    return `${candidate.pathname}${candidate.search}${candidate.hash}` || fallback;
  } catch {
    return fallback;
  }
};

export const buildAuthEntryUrl = (path, returnUrl = '/') => {
  const safePath = ensureLeadingSlash(path);
  const safeReturnUrl = normalizeLocalReturnUrl(returnUrl);

  if (safeReturnUrl === '/') {
    return safePath;
  }

  const params = new URLSearchParams({ returnUrl: safeReturnUrl });
  return `${safePath}?${params.toString()}`;
};

export const buildGoogleLoginUrl = (returnUrl = '/') => {
  const apiBaseUrl = new URL(getApiBaseUrl(), window.location.origin);
  const callbackPath = buildAuthEntryUrl(OAUTH_CALLBACK_PATH, returnUrl);
  const callbackUrl = new URL(callbackPath, window.location.origin);
  const loginUrl = new URL(joinUrlPath(apiBaseUrl.pathname, GOOGLE_LOGIN_PATH), apiBaseUrl.origin);

  loginUrl.searchParams.set('returnUrl', callbackUrl.toString());
  return loginUrl.toString();
};

export const startGoogleLogin = (returnUrl = '/') => {
  window.location.assign(buildGoogleLoginUrl(returnUrl));
};

export const getGoogleAuthErrorMessage = (errorCode) => {
  if (errorCode === 'not_configured') {
    return 'Google sign-in is not available right now. Try email/password instead.';
  }

  return 'Google sign-in failed. Try again or use email/password.';
};
