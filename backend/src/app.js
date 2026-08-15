const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const ngoRouter = require('./routes/ngos');
const campaignRouter = require('./routes/campaigns');
const donationRouter = require('./routes/donations');
const analyticsRouter = require('./routes/analytics');

const app = express();

app.use(cors({ origin: config.clientUrl, credentials: true }));
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
app.use(requestLogger);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/ngos', ngoRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/donations', donationRouter);
app.use('/api/analytics', analyticsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
