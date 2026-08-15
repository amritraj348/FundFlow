import apiClient from './client';

export function createDonationOrder(payload) {
  return apiClient.post('/donations/create-order', payload).then((res) => res.data);
}

export function verifyDonationPayment(payload) {
  return apiClient.post('/donations/verify-payment', payload).then((res) => res.data);
}

// The receipt endpoint requires the Authorization header, so a plain
// <a href> won't work (browsers don't attach custom headers to a bare
// navigation) — fetch it as a blob through the authenticated axios client
// instead, then trigger the download client-side.
export async function downloadReceipt(donationId) {
  const res = await apiClient.get(`/donations/${donationId}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `FundFlow-Receipt-${donationId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
