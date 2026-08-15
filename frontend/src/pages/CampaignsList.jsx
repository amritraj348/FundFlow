import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchCampaigns } from '../api/campaigns';

const DEBOUNCE_MS = 400;

export default function CampaignsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  // Local input state updates every keystroke; the URL (and therefore the
  // actual fetch) only updates after the user stops typing, so we're not
  // hitting the API on every character.
  const [searchInput, setSearchInput] = useState(search);

  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // One-time-ish fetch of a broad, unfiltered batch just to derive the set
  // of categories that actually exist — categories are free text set by
  // NGOs, not a backend enum, so there's nowhere else to get this list from.
  useEffect(() => {
    fetchCampaigns({ limit: 100 })
      .then((data) => {
        const distinct = [...new Set(data.campaigns.map((c) => c.category).filter(Boolean))].sort();
        setCategories(distinct);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set('search', searchInput);
        else next.delete('search');
        next.delete('page'); // new search always starts back at page 1
        return next;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchCampaigns({
          page,
          search: search || undefined,
          category: category || undefined,
        });
        if (!cancelled) {
          setCampaigns(data.campaigns);
          setPagination(data.pagination);
        }
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
  }, [page, search, category]);

  function handleCategoryChange(e) {
    const value = e.target.value;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('category', value);
      else next.delete('category');
      next.delete('page');
      return next;
    });
  }

  function goToPage(nextPage) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(nextPage));
      return next;
    });
  }

  const hasActiveFilters = Boolean(search || category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Active campaigns</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search campaigns…"
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
        <select
          value={category}
          onChange={handleCategoryChange}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-6 text-gray-500">Loading campaigns…</p>}
      {error && <p className="mt-6 text-red-600">{error}</p>}
      {!isLoading && !error && campaigns.length === 0 && (
        <p className="mt-6 text-gray-500">
          {hasActiveFilters ? 'No campaigns match your search or filter.' : 'No active campaigns yet — check back soon.'}
        </p>
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

      {!isLoading && !error && pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= pagination.pages}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
