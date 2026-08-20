import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { fetchMyCampaigns, createCampaign, updateCampaign, closeCampaign } from '../../api/campaigns';
import StatusBadge from '../ui/StatusBadge';

const EMPTY_FORM = { title: '', description: '', category: '', goalAmount: '', endDate: '', status: 'draft', image: null };

function campaignToForm(c) {
  if (!c) return EMPTY_FORM;
  return {
    title: c.title,
    description: c.description,
    category: c.category || '',
    goalAmount: String(c.goalAmount),
    endDate: c.endDate ? c.endDate.slice(0, 10) : '',
    status: c.status === 'active' ? 'active' : 'draft',
    image: null,
  };
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600';

export default function CampaignManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['myCampaigns'], queryFn: fetchMyCampaigns });
  const campaigns = data?.campaigns || [];

  // null = form hidden, 'new' = creating, otherwise the campaign _id being edited.
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState('');

  const saveMutation = useMutation({
    mutationFn: (payload) => (editingId === 'new' ? createCampaign(payload) : updateCampaign(editingId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCampaigns'] });
      setEditingId(null);
      setErrorMessage('');
    },
    onError: (err) => setErrorMessage(err.response?.data?.message || 'Could not save the campaign.'),
  });

  const closeMutation = useMutation({
    mutationFn: (id) => closeCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myCampaigns'] }),
  });

  function startCreate() {
    setForm(EMPTY_FORM);
    setErrorMessage('');
    setEditingId('new');
  }

  function startEdit(campaign) {
    setForm(campaignToForm(campaign));
    setErrorMessage('');
    setEditingId(campaign._id);
  }

  function handleChange(e) {
    const { name, value, files } = e.target;
    setForm((prev) => (name === 'image' ? { ...prev, image: files[0] || null } : { ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    saveMutation.mutate(form);
  }

  function handleClose(campaign) {
    if (window.confirm(`Close "${campaign.title}"? This can't be undone.`)) {
      closeMutation.mutate(campaign._id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your campaigns</h2>
        {editingId === null && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            New campaign
          </button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">{editingId === 'new' ? 'Create campaign' : 'Edit campaign'}</h3>
          {errorMessage && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" rows={3} value={form.description} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal amount (INR)</label>
              <input
                name="goalAmount"
                type="number"
                min="1"
                value={form.goalAmount}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input name="category" value={form.category} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End date</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Cover image{' '}
                {editingId !== 'new' && <span className="font-normal text-gray-400">(leave blank to keep current)</span>}
              </label>
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} className="mt-1 w-full text-sm" />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving…' : editingId === 'new' ? 'Create campaign' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="mt-4 text-gray-500">Loading your campaigns…</p>}
      {isError && <p className="mt-4 text-red-600">Could not load your campaigns.</p>}
      {!isLoading && !isError && campaigns.length === 0 && editingId === null && (
        <p className="mt-4 text-gray-500">You haven&apos;t created any campaigns yet.</p>
      )}

      {campaigns.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Title</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Raised</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Donors</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
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
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-900">
                    ₹{c.raisedAmount.toLocaleString('en-IN')} / ₹{c.goalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{c.donorCount}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => startEdit(c)} className="font-medium text-teal-700 hover:text-teal-800">
                        Edit
                      </button>
                      {c.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleClose(c)}
                          disabled={closeMutation.isPending}
                          className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Close
                        </button>
                      )}
                    </div>
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
