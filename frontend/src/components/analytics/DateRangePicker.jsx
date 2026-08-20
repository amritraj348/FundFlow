const GRANULARITIES = ['day', 'week', 'month'];

// Controlled range picker wired straight to the Phase 6 ?from=&to=&granularity=
// params. `value` is expected to already be in yyyy-mm-dd form for from/to
// (the parent derives that from the API's own `range` echo on first load, so
// this component never needs to know the backend's default-30-days rule).
export default function DateRangePicker({ value, onChange }) {
  function update(patch) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500">From</label>
        <input
          type="date"
          value={value.from}
          onChange={(e) => update({ from: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">To</label>
        <input
          type="date"
          value={value.to}
          onChange={(e) => update({ to: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500">Granularity</label>
        <select
          value={value.granularity}
          onChange={(e) => update({ granularity: e.target.value })}
          className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
        >
          {GRANULARITIES.map((g) => (
            <option key={g} value={g}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
