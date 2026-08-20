require('dotenv').config();

// Central place all config is read from — nothing else in the app should
// touch process.env directly, so a missing var fails fast and obviously.
const required = ['MONGO_URI'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

// CLIENT_URL may be a single origin or a comma-separated list (e.g. a
// Vercel preview URL alongside the production domain post-deploy) — CORS
// checks against this exact set, never a wildcard.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: allowedOrigins[0],
  allowedOrigins,

  mongoUri: process.env.MONGO_URI,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'FundFlow <no-reply@fundflow.dev>',
  },
};

module.exports = config;
