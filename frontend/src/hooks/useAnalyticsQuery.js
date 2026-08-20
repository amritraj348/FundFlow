import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { toDateInputValue } from '../utils/date';

// Wraps a Phase 6 analytics fetch (getNgoAnalytics / getPlatformAnalytics)
// with date-range state for the DateRangePicker. `range` starts null so the
// first fetch omits from/to/granularity entirely and gets the backend's own
// default (last 30 days) — the picker is then populated from the response's
// echoed `range` rather than duplicating that default on the frontend.
export function useAnalyticsQuery(queryKey, fetchFn, { enabled = true } = {}) {
  const [range, setRange] = useState(null);

  const params = range || undefined;

  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchFn(params),
    enabled,
  });

  const pickerValue = {
    from: range?.from ?? (query.data ? toDateInputValue(query.data.range.from) : ''),
    to: range?.to ?? (query.data ? toDateInputValue(query.data.range.to) : ''),
    granularity: range?.granularity ?? query.data?.range.granularity ?? 'day',
  };

  return { ...query, pickerValue, setRange };
}
