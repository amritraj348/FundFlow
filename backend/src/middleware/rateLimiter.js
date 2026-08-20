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

// Resource-creation endpoints (donation order creation, campaign creation,
// NGO creation) — each one costs real work downstream (a Razorpay API call,
// a Cloudinary upload) or creates a persistent record, so they get a purpose
// -built limit rather than relying solely on the general API-wide one below.
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down and try again shortly.' },
});

// Baseline safety net applied to the whole API — generous enough that no
// legitimate browsing/dashboard session should ever hit it, there mainly to
// blunt a single client hammering any endpoint.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

module.exports = { authLimiter, createLimiter, apiLimiter };
