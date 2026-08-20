import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchNgos, setNgoApproval } from '../../api/ngos';
import StatusBadge from '../ui/StatusBadge';

// Used twice on the super admin dashboard: once pinned to approvalStatus
// "pending" (the moderation queue), once with a selectable filter (the
// broader "all NGOs" browse view) — same table, same actions, since an
// admin might reasonably want to reverse a decision on an already-approved
// or already-rejected NGO too, not just triage the pending queue.
export default function NgoModerationTable({ title, fixedStatus }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(fixedStatus || 'pending');
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const effectiveStatus = fixedStatus || statusFilter;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ngos', { approvalStatus: effectiveStatus }],
    queryFn: () => fetchNgos({ approvalStatus: effectiveStatus, limit: 50 }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }) => setNgoApproval(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngos'] });
      setRejectingId(null);
      setReason('');
    },
  });

  const ngos = data?.ngos || [];

  function approve(id) {
    mutation.mutate({ id, payload: { approvalStatus: 'approved' } });
  }

  function submitReject(id) {
    if (!reason.trim()) return;
    mutation.mutate({ id, payload: { approvalStatus: 'rejected', reason: reason.trim() } });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {!fixedStatus && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        )}
      </div>

      {isLoading && <p className="mt-4 text-gray-500">Loading…</p>}
      {isError && <p className="mt-4 text-red-600">Could not load NGOs.</p>}
      {!isLoading && !isError && ngos.length === 0 && <p className="mt-4 text-gray-500">Nothing here.</p>}

      {ngos.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ngos.map((ngo) => (
                <Fragment key={ngo._id}>
                  <tr>
                    <td className="px-4 py-2 text-gray-900">{ngo.name}</td>
                    <td className="px-4 py-2 text-gray-500">{ngo.email}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={ngo.approvalStatus} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        {ngo.approvalStatus !== 'approved' && (
                          <button type="button" onClick={() => approve(ngo._id)} className="font-medium text-green-700 hover:text-green-800">
                            Approve
                          </button>
                        )}
                        {ngo.approvalStatus !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(ngo._id);
                              setReason('');
                            }}
                            className="font-medium text-red-600 hover:text-red-700"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {rejectingId === ngo._id && (
                    <tr>
                      <td colSpan={4} className="bg-red-50 px-4 py-3">
                        <label className="block text-xs font-medium text-red-700">Reason for rejection</label>
                        <div className="mt-1 flex gap-2">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why is this NGO being rejected?"
                            className="flex-1 rounded-md border border-red-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => submitReject(ngo._id)}
                            disabled={!reason.trim() || mutation.isPending}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
