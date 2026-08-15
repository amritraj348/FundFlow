import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchCampaignByIdOrSlug } from '../api/campaigns';
import DonationPanel from '../components/donations/DonationPanel';

const STATUS_MESSAGES = {
  closed: 'This campaign is now closed and no longer accepting donations.',
  completed: 'This campaign has reached its goal — thank you to everyone who gave!',
  draft: 'This campaign has not been published yet.',
};

export default function CampaignDetail() {
  const { idOrSlug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent } = {}) => {
      if (!silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const data = await fetchCampaignByIdOrSlug(idOrSlug);
        setCampaign(data.campaign);
      } catch {
        setError('Campaign not found.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [idOrSlug]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <p className="mx-auto max-w-3xl px-4 py-12 text-gray-500 sm:px-6">Loading…</p>;

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-red-600">{error || 'Campaign not found.'}</p>
        <Link to="/campaigns" className="mt-4 inline-block text-teal-700 hover:text-teal-800">
          &larr; Back to campaigns
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to="/campaigns" className="text-sm text-teal-700 hover:text-teal-800">
        &larr; Back to campaigns
      </Link>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-teal-700">{campaign.ngo?.name}</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">{campaign.title}</h1>
      <p className="mt-4 whitespace-pre-line text-gray-700">{campaign.description}</p>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-teal-600" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-xl font-semibold text-gray-900">
            ₹{campaign.raisedAmount.toLocaleString('en-IN')} <span className="text-sm font-normal text-gray-500">raised</span>
          </p>
          <p className="text-sm text-gray-500">of ₹{campaign.goalAmount.toLocaleString('en-IN')} goal</p>
        </div>
        <p className="mt-1 text-sm text-gray-500">{campaign.donorCount} donation(s) so far</p>

        {campaign.status === 'active' ? (
          <DonationPanel campaign={campaign} onDonationSuccess={() => load({ silent: true })} />
        ) : (
          <p className="mt-6 rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-600">
            {STATUS_MESSAGES[campaign.status] || 'This campaign is not currently accepting donations.'}
          </p>
        )}
      </div>
    </div>
  );
}
