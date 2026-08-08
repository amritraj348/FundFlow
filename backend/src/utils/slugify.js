const crypto = require('crypto');

// Slugifies a title and appends a short random suffix so two campaigns with
// the same title (e.g. "Winter Relief" from two different NGOs) don't
// collide on the unique slug index.
function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

module.exports = slugify;
