import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { fetchCampaigns } from '../../api/campaigns';
import StatusBadge from '../ui/StatusBadge';

const STATUSES = ['active', 'closed', 'completed'];

export default function CampaignBrowseTable() {
  const [status, setStatus] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['allCampaigns', { status }],
    queryFn: () => fetchCampaigns({ status: status || undefined, limit: 50 }),
  });

  const campaigns = data?.campaigns || [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">All campaigns</h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-4 text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-red-600">Could not load campaigns.</p>}
      {!isLoading && !isError && campaigns.length === 0 && <p className="mt-4 text-gray-500">No campaigns found.</p>}

      {campaigns.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">NGO</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Raised</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td className="px-4 py-2">
                    <Link to={`/campaigns/${c.slug}`} className="text-teal-700 hover:text-teal-800">
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{c.ngo?.name}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-900">
                    ₹{c.raisedAmount.toLocaleString('en-IN')} / ₹{c.goalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
