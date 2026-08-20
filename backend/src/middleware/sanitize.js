// Strips keys starting with "$" or containing "." from req.body/req.query/
// req.params, recursively. Without this, a client can send e.g.
// { "email": { "$ne": null } } as a JSON body and have Mongoose pass that
// straight into a query filter — MongoDB then evaluates it as an operator,
// not a literal value, which is enough to bypass an intended exact-match
// lookup (the classic NoSQL operator-injection class of bug). Field-level
// validators here happen to catch some cases (e.g. email regex coerces an
// object to "[object Object]" and fails format checks), but that's
// incidental, not a systemic guarantee — this runs before every route so
// the whole app is covered by one rule instead of per-field vigilance.
function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }
  return value;
}

function sanitizeInPlace(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    obj[key] = sanitizeValue(obj[key]);
  }
}

function sanitize(req, res, next) {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.query);
  sanitizeInPlace(req.params);
  next();
}

module.exports = sanitize;
