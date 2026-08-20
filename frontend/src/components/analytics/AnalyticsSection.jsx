import StatCard from '../ui/StatCard';
import DateRangePicker from './DateRangePicker';
import TrendChart from './TrendChart';

// Shared by the NGO admin and super admin dashboards — both fetch the same
// shaped response (allTime/summary/trend + a top-N list), just from
// different Phase 6 endpoints and with a different top-N item shape.
export default function AnalyticsSection({ analyticsQuery, topItemsKey, topItemLabelKey, topListTitle, extraStats }) {
  const { data, isLoading, isError, pickerValue, setRange } = analyticsQuery;

  if (isLoading) return <p className="text-gray-500">Loading analytics…</p>;
  if (isError) return <p className="text-red-600">Could not load analytics right now.</p>;
  if (!data) return null;

  const topItems = data[topItemsKey] || [];

  return (
    <div className="flex flex-col gap-4">
      <DateRangePicker value={pickerValue} onChange={setRange} />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">All-time</p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Total raised" value={`₹${data.allTime.totalRaised.toLocaleString('en-IN')}`} />
          <StatCard label="Total donations" value={data.allTime.totalDonations} />
          <StatCard label="Total donors" value={data.allTime.totalDonors} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selected range</p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Raised" value={`₹${data.summary.totalRaised.toLocaleString('en-IN')}`} />
          <StatCard label="Donations" value={data.summary.totalDonations} />
          <StatCard label="Donors" value={data.summary.totalDonors} />
        </div>
      </div>

      {extraStats && extraStats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {extraStats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Donation trend</p>
        <TrendChart data={data.trend} />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">{topListTitle}</p>
        {topItems.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing in this range yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <tbody className="divide-y divide-gray-100">
                {topItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-900">{item[topItemLabelKey]}</td>
                    <td className="px-4 py-2 text-gray-500">{item.donations} donation(s)</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ₹{item.amount.toLocaleString('en-IN')}
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
