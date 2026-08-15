const express = require('express');

const { createOrder, verifyPayment, listMyDonations } = require('../controllers/donationController');
const { validateCreateOrder, validateVerifyPayment } = require('../validators/donationValidators');
const protect = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

router.post('/create-order', optionalAuth, validateCreateOrder, createOrder);
router.post('/verify-payment', validateVerifyPayment, verifyPayment);
router.get('/my', protect, listMyDonations);

module.exports = router;
