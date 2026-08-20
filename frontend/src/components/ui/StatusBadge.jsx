const STYLES = {
  // campaign statuses
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
  completed: 'bg-teal-100 text-teal-800',
  // NGO approval / donation statuses
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  created: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-amber-100 text-amber-800',
};

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}
