import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../context/AuthContext';
import { fetchMyNgo } from '../../api/ngos';
import { fetchNgoAnalytics } from '../../api/analytics';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import NgoProfileSection from '../../components/dashboard/NgoProfileSection';
import CampaignManager from '../../components/dashboard/CampaignManager';
import AnalyticsSection from '../../components/analytics/AnalyticsSection';

export default function NgoAdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ['myNgo'], queryFn: fetchMyNgo });
  const ngo = data?.ngo;
  const isApproved = ngo?.approvalStatus === 'approved';

  const analyticsQuery = useAnalyticsQuery(['ngoAnalytics'], fetchNgoAnalytics, { enabled: isApproved });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
      <p className="mt-1 text-gray-600">Manage your NGO profile, campaigns, and see how your fundraising is doing.</p>

      <div className="mt-6">
        {isLoading && <p className="text-gray-500">Loading your NGO profile…</p>}
        {isError && <p className="text-red-600">Could not load your NGO profile.</p>}
        {!isLoading && !isError && <NgoProfileSection ngo={ngo} />}
      </div>

      {isApproved && (
        <>
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
            <div className="mt-4">
              <AnalyticsSection
                analyticsQuery={analyticsQuery}
                topItemsKey="topCampaigns"
                topItemLabelKey="title"
                topListTitle="Top campaigns"
              />
            </div>
          </div>

          <div className="mt-10">
            <CampaignManager />
          </div>
        </>
      )}
    </div>
  );
}
