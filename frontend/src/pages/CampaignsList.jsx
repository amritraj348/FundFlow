import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchCampaigns } from '../api/campaigns';

// Light real listing — proves the routing/API wiring end to end. The full
// search/filter/pagination UI is explicitly Phase 8 scope, not this one.
export default function CampaignsList() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchCampaigns();
        if (!cancelled) setCampaigns(data.campaigns);
      } catch {
        if (!cancelled) setError('Could not load campaigns right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Active campaigns</h1>

      {isLoading && <p className="mt-6 text-gray-500">Loading campaigns…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      {!isLoading && !error && campaigns.length === 0 && (
        <p className="mt-6 text-gray-500">No active campaigns yet — check back soon.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Link
            key={campaign._id}
            to={`/campaigns/${campaign.slug}`}
            className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">{campaign.ngo?.name}</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">{campaign.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm text-gray-500">{campaign.description}</p>
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full bg-teal-600"
                  style={{ width: `${Math.min(100, (campaign.raisedAmount / campaign.goalAmount) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">₹{campaign.raisedAmount.toLocaleString('en-IN')}</span>{' '}
                raised of ₹{campaign.goalAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
