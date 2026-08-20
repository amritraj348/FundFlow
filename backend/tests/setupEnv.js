// Runs per test file, before that file's own top-level `require`s — critical,
// because config/env.js reads process.env once at first require and throws
// if MONGO_URI is missing. dotenv.config() (called inside config/env.js)
// never overwrites already-set vars, so seeding everything here first means
// the real backend/.env is never consulted at all during tests — no risk of
// a test run touching real Atlas data or real third-party credentials.
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.CLIENT_URL = 'http://localhost:5173';

process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

process.env.RAZORPAY_KEY_ID = 'rzp_test_fake_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_razorpay_webhook_secret';

process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
process.env.CLOUDINARY_API_KEY = 'test_cloudinary_key';
process.env.CLOUDINARY_API_SECRET = 'test_cloudinary_secret';

const uriFile = path.join(__dirname, '.mongo-uri');
process.env.MONGO_URI = fs.readFileSync(uriFile, 'utf8').trim();
