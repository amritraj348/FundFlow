import apiClient from './client';

export function fetchCampaigns(params) {
  return apiClient.get('/campaigns', { params }).then((res) => res.data);
}

export function fetchCampaignByIdOrSlug(idOrSlug) {
  return apiClient.get(`/campaigns/${idOrSlug}`).then((res) => res.data);
}

export function fetchMyCampaigns() {
  return apiClient.get('/campaigns/mine').then((res) => res.data);
}

// `payload` is a plain object; image (if present) is a File. Sent as
// multipart/form-data since the backend accepts an optional cover image
// upload alongside the campaign fields — axios sets the right Content-Type
// automatically when given a FormData body.
function toFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });
  return formData;
}

export function createCampaign(payload) {
  return apiClient.post('/campaigns', toFormData(payload)).then((res) => res.data);
}

export function updateCampaign(id, payload) {
  return apiClient.put(`/campaigns/${id}`, toFormData(payload)).then((res) => res.data);
}

export function closeCampaign(id) {
  return apiClient.patch(`/campaigns/${id}/close`).then((res) => res.data);
}
