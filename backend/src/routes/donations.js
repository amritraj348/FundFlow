const express = require('express');

const { createOrder, verifyPayment, handleWebhook, listMyDonations, getReceipt } = require('../controllers/donationController');
const { validateCreateOrder, validateVerifyPayment } = require('../validators/donationValidators');
const protect = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { createLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/create-order', createLimiter, optionalAuth, validateCreateOrder, createOrder);
router.post('/verify-payment', validateVerifyPayment, verifyPayment);
// Called server-to-server by Razorpay, not by our own frontend — no auth,
// signature verification (in the controller) is what authenticates the caller.
router.post('/webhook', handleWebhook);
router.get('/my', protect, listMyDonations);
router.get('/:id/receipt', protect, getReceipt);

module.exports = router;
