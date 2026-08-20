import { useAuth } from '../../context/AuthContext';
import { fetchPlatformAnalytics } from '../../api/analytics';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import AnalyticsSection from '../../components/analytics/AnalyticsSection';
import NgoModerationTable from '../../components/dashboard/NgoModerationTable';
import CampaignBrowseTable from '../../components/dashboard/CampaignBrowseTable';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const analyticsQuery = useAnalyticsQuery(['platformAnalytics'], fetchPlatformAnalytics);

  const extraStats = analyticsQuery.data
    ? [
        { label: 'Active campaigns', value: analyticsQuery.data.platform.totalActiveCampaigns },
        { label: 'Total NGOs', value: analyticsQuery.data.platform.totalNgos },
        { label: 'Total users', value: analyticsQuery.data.platform.totalUsers },
        { label: 'Pending NGOs', value: analyticsQuery.data.platform.ngosByStatus.pending || 0 },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
      <p className="mt-1 text-gray-600">Platform-wide analytics and NGO moderation.</p>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Platform analytics</h2>
        <div className="mt-4">
          <AnalyticsSection
            analyticsQuery={analyticsQuery}
            topItemsKey="topNgos"
            topItemLabelKey="name"
            topListTitle="Top NGOs"
            extraStats={extraStats}
          />
        </div>
      </div>

      <div className="mt-10">
        <NgoModerationTable title="NGO moderation queue" fixedStatus="pending" />
      </div>

      <div className="mt-10">
        <NgoModerationTable title="All NGOs" />
      </div>

      <div className="mt-10">
        <CampaignBrowseTable />
      </div>
    </div>
  );
}
