const GRANULARITIES = ['day', 'week', 'month'];
const DEFAULT_WINDOW_DAYS = 30;

// Resolves ?from=&to=&granularity= into concrete Date bounds and a validated
// $dateTrunc unit, defaulting to the last 30 days when omitted.
function resolveDateRange(query) {
  const now = new Date();

  const to = query.to ? new Date(query.to) : now;
  if (Number.isNaN(to.getTime())) {
    const error = new Error('Invalid "to" date');
    error.statusCode = 400;
    throw error;
  }

  let from;
  if (query.from) {
    from = new Date(query.from);
    if (Number.isNaN(from.getTime())) {
      const error = new Error('Invalid "from" date');
      error.statusCode = 400;
      throw error;
    }
  } else {
    from = new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }

  if (from > to) {
    const error = new Error('"from" must be before "to"');
    error.statusCode = 400;
    throw error;
  }

  const granularity = query.granularity || 'day';
  if (!GRANULARITIES.includes(granularity)) {
    const error = new Error(`granularity must be one of: ${GRANULARITIES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return { from, to, granularity };
}

module.exports = { resolveDateRange };
