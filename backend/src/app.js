const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const ngoRouter = require('./routes/ngos');
const campaignRouter = require('./routes/campaigns');
const donationRouter = require('./routes/donations');
const analyticsRouter = require('./routes/analytics');

const app = express();

// CSP is a document-level protection — it governs what a rendered HTML page
// is allowed to load/execute. This server never serves HTML (JSON + one PDF
// download route), so that half of helmet doesn't apply here; the frontend
// SPA sets its own CSP via a <meta> tag since it's the one actually
// rendering a document. Helmet's other headers (X-Content-Type-Options,
// X-Frame-Options, HSTS, etc.) still apply and matter even for a JSON/file API.
app.use(helmet({ contentSecurityPolicy: false }));

// Explicit allow-list, not a wildcard — only origins named in CLIENT_URL
// (comma-separated) get the CORS headers; anything else is rejected outright
// rather than just silently omitting Access-Control-Allow-Origin.
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, same-origin) — allow;
      // browsers always send Origin for cross-site XHR/fetch, so this
      // doesn't weaken the check for the case it actually defends.
      if (!origin || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error(`Origin ${origin} is not allowed by CORS`);
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(
  express.json({
    // Stashes the exact raw bytes alongside the parsed body. The Razorpay
    // webhook route needs these to verify the HMAC signature — re-serializing
    // req.body wouldn't reliably reproduce the exact bytes Razorpay signed.
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);
app.use(requestLogger);
app.use('/api', apiLimiter);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/ngos', ngoRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/donations', donationRouter);
app.use('/api/analytics', analyticsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
