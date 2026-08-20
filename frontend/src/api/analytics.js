import apiClient from './client';

export function fetchNgoAnalytics(params) {
  return apiClient.get('/analytics/ngo', { params }).then((res) => res.data);
}

export function fetchPlatformAnalytics(params) {
  return apiClient.get('/analytics/platform', { params }).then((res) => res.data);
}
