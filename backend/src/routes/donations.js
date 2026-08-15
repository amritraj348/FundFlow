const express = require('express');

const { createOrder, verifyPayment, handleWebhook, listMyDonations } = require('../controllers/donationController');
const { validateCreateOrder, validateVerifyPayment } = require('../validators/donationValidators');
const protect = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

const router = express.Router();

router.post('/create-order', optionalAuth, validateCreateOrder, createOrder);
router.post('/verify-payment', validateVerifyPayment, verifyPayment);
// Called server-to-server by Razorpay, not by our own frontend — no auth,
// signature verification (in the controller) is what authenticates the caller.
router.post('/webhook', handleWebhook);
router.get('/my', protect, listMyDonations);

module.exports = router;
