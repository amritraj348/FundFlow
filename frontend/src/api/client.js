import axios from 'axios';

import { getAccessToken, getRefreshToken, setTokens, triggerForcedLogout } from './tokenStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Concurrent 401s should trigger exactly one refresh call, not one per
// failed request — every request that arrives while a refresh is already
// in flight awaits this same promise instead of starting its own.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken: getRefreshToken() })
      .then((res) => {
        setTokens({ accessToken: res.data.accessToken });
        return res.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Endpoints where a 401 means something other than "access token expired" —
// retrying them through the refresh flow would be wrong (login/register 401
// = bad credentials) or dangerous (refresh 401 = refresh token itself is
// dead, retrying would infinite-loop).
function isAuthEndpoint(url) {
  return /\/auth\/(login|register|refresh)$/.test(url || '');
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || !config || isAuthEndpoint(config.url)) {
      return Promise.reject(error);
    }

    if (!getRefreshToken()) {
      triggerForcedLogout();
      return Promise.reject(error);
    }

    if (config._retry) {
      // Already retried once with a fresh token and still got a 401 —
      // refreshing again won't help.
      triggerForcedLogout();
      return Promise.reject(error);
    }
    config._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      triggerForcedLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
