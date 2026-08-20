import apiClient from './client';

export function fetchMyNgo() {
  return apiClient.get('/ngos/me').then((res) => res.data);
}

export function createNgo(payload) {
  return apiClient.post('/ngos', payload).then((res) => res.data);
}

export function updateNgo(id, payload) {
  return apiClient.put(`/ngos/${id}`, payload).then((res) => res.data);
}

export function fetchNgos(params) {
  return apiClient.get('/ngos', { params }).then((res) => res.data);
}

export function setNgoApproval(id, payload) {
  return apiClient.patch(`/ngos/${id}/approval`, payload).then((res) => res.data);
}
