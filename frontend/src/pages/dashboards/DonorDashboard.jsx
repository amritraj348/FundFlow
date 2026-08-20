import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { fetchMyDonations, downloadReceipt } from '../../api/donations';
import StatusBadge from '../../components/ui/StatusBadge';
import StatCard from '../../components/ui/StatCard';

export default function DonorDashboard() {
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['myDonations'],
    queryFn: () => fetchMyDonations(),
  });

  async function handleDownload(id) {
    setDownloadError('');
    setDownloadingId(id);
    try {
      await downloadReceipt(id);
    } catch {
      setDownloadError('Could not download that receipt right now — please try again in a moment.');
    } finally {
      setDownloadingId(null);
    }
  }

  const donations = data?.donations || [];
  const successful = donations.filter((d) => d.status === 'success');
  const totalDonated = successful.reduce((sum, d) => sum + d.amount, 0);
  const campaignsSupported = new Set(successful.map((d) => d.campaign?._id).filter(Boolean)).size;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
      <p className="mt-1 text-gray-600">Your donation history and receipts.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total donated" value={`₹${totalDonated.toLocaleString('en-IN')}`} />
        <StatCard label="Successful donations" value={successful.length} />
        <StatCard label="Campaigns supported" value={campaignsSupported} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Donation history</h2>

        {isLoading && <p className="mt-4 text-gray-500">Loading your donations…</p>}
        {isError && <p className="mt-4 text-red-600">Could not load your donation history.</p>}
        {downloadError && <p className="mt-4 text-red-600">{downloadError}</p>}

        {!isLoading && !isError && donations.length === 0 && (
          <p className="mt-4 text-gray-500">
            You haven&apos;t made any donations yet.{' '}
            <Link to="/campaigns" className="text-teal-700 hover:text-teal-800">
              Browse campaigns
            </Link>
            .
          </p>
        )}

        {donations.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Campaign</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donations.map((d) => (
                  <tr key={d._id}>
                    <td className="px-4 py-2">
                      {d.campaign ? (
                        <Link to={`/campaigns/${d.campaign.slug}`} className="text-teal-700 hover:text-teal-800">
                          {d.campaign.title}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Campaign removed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">₹{d.amount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-gray-500">{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-2">
                      {d.status === 'success' ? (
                        <button
                          type="button"
                          onClick={() => handleDownload(d._id)}
                          disabled={downloadingId === d._id}
                          className="font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
                        >
                          {downloadingId === d._id ? 'Preparing…' : 'Download'}
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
