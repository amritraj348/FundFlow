import apiClient from './client';

export function fetchCampaigns(params) {
  return apiClient.get('/campaigns', { params }).then((res) => res.data);
}

export function fetchCampaignByIdOrSlug(idOrSlug) {
  return apiClient.get(`/campaigns/${idOrSlug}`).then((res) => res.data);
}
