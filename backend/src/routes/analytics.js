const express = require('express');

const { getNgoAnalytics, getPlatformAnalytics } = require('../controllers/analyticsController');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.get('/ngo', protect, authorize('ngo_admin'), getNgoAnalytics);
router.get('/platform', protect, authorize('super_admin'), getPlatformAnalytics);

module.exports = router;
