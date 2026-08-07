const rateLimit = require('express-rate-limit');

// Applied to register/login/refresh — generous enough for normal retries,
// tight enough to blunt brute-force / credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

module.exports = { authLimiter };
