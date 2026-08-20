const crypto = require('crypto');

// Single source of truth for "does this HMAC-SHA256 signature match", used
// everywhere a signature is checked (verify-payment, the Razorpay webhook).
// Centralizing it means the timing-safe comparison only has to be gotten
// right once — a copy-pasted second implementation is exactly how a future
// change accidentally regresses to a plain `===` comparison in only one of
// the two call sites.
function verifyHmacSignature({ payload, secret, signature }) {
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');

  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

module.exports = { verifyHmacSignature };
