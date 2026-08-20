import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createNgo, updateNgo } from '../../api/ngos';
import StatusBadge from '../ui/StatusBadge';

const EMPTY_FORM = { name: '', email: '', description: '', phone: '', website: '', category: '', registrationNumber: '' };

function ngoToForm(ngo) {
  if (!ngo) return EMPTY_FORM;
  return {
    name: ngo.name || '',
    email: ngo.email || '',
    description: ngo.description || '',
    phone: ngo.phone || '',
    website: ngo.website || '',
    category: ngo.category || '',
    registrationNumber: ngo.registrationNumber || '',
  };
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600';

// Doubles as the "create your NGO profile" form (ngo === null) and the
// view/edit card once a profile exists — same fields either way, so one
// component covers both rather than a separate create flow.
export default function NgoProfileSection({ ngo }) {
  const queryClient = useQueryClient();
  const isCreateMode = !ngo;
  const [isEditing, setIsEditing] = useState(isCreateMode);
  const [form, setForm] = useState(() => ngoToForm(ngo));
  const [errorMessage, setErrorMessage] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => (isCreateMode ? createNgo(payload) : updateNgo(ngo._id, payload)),
    onSuccess: (data) => {
      // Write the mutation response straight into the cache instead of just
      // invalidating and waiting on a refetch — invalidation alone leaves a
      // render where isEditing is already false but the `ngo` prop is still
      // its old value (null in create mode), which crashes the view branch
      // below on `ngo.name`. setQueryData updates every subscriber
      // synchronously with data we already have, closing that gap.
      queryClient.setQueryData(['myNgo'], { success: true, ngo: data.ngo });
      setIsEditing(false);
      setErrorMessage('');
    },
    onError: (err) => setErrorMessage(err.response?.data?.message || 'Could not save the NGO profile.'),
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate(form);
  }

  function startEditing() {
    setForm(ngoToForm(ngo));
    setErrorMessage('');
    setIsEditing(true);
  }

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{ngo.name}</h2>
            <div className="mt-1">
              <StatusBadge status={ngo.approvalStatus} />
            </div>
          </div>
          <button type="button" onClick={startEditing} className="text-sm font-medium text-teal-700 hover:text-teal-800">
            Edit profile
          </button>
        </div>

        {ngo.approvalStatus === 'rejected' && ngo.moderationReason && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <span className="font-medium">Rejected:</span> {ngo.moderationReason}
          </p>
        )}
        {ngo.approvalStatus === 'pending' && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Your NGO profile is awaiting review by a platform admin. You&apos;ll be able to create campaigns once
            approved.
          </p>
        )}

        {ngo.description && <p className="mt-3 text-sm text-gray-600">{ngo.description}</p>}

        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-gray-500">Email: </dt>
            <dd className="inline text-gray-900">{ngo.email}</dd>
          </div>
          {ngo.phone && (
            <div>
              <dt className="inline text-gray-500">Phone: </dt>
              <dd className="inline text-gray-900">{ngo.phone}</dd>
            </div>
          )}
          {ngo.website && (
            <div>
              <dt className="inline text-gray-500">Website: </dt>
              <dd className="inline text-gray-900">{ngo.website}</dd>
            </div>
          )}
          {ngo.category && (
            <div>
              <dt className="inline text-gray-500">Category: </dt>
              <dd className="inline text-gray-900">{ngo.category}</dd>
            </div>
          )}
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        {isCreateMode ? 'Create your NGO profile' : 'Edit NGO profile'}
      </h2>
      {isCreateMode && (
        <p className="mt-1 text-sm text-gray-500">You need an approved NGO profile before you can create campaigns.</p>
      )}
      {errorMessage && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input name="name" value={form.name} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Website</label>
          <input name="website" value={form.website} onChange={handleChange} placeholder="https://" className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input name="category" value={form.category} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Registration number</label>
          <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={3} value={form.description} onChange={handleChange} className={inputClass} />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create profile' : 'Save changes'}
        </button>
        {!isCreateMode && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
