const mongoose = require('mongoose');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCreateOrder(req, res, next) {
  const { campaignId, amount, guestInfo, message } = req.body;
  const errors = [];

  if (!campaignId || !mongoose.isValidObjectId(campaignId)) {
    errors.push('A valid campaignId is required');
  }

  const numericAmount = Number(amount);
  if (amount === undefined || Number.isNaN(numericAmount) || numericAmount < 1) {
    errors.push('amount must be a number of at least 1 (rupee)');
  }

  // Anonymous/guest checkout — no account, so we need a way to reach the
  // donor for the receipt (Phase 5).
  if (!req.user) {
    if (!guestInfo || typeof guestInfo !== 'object') {
      errors.push('guestInfo (name, email) is required for guest donations');
    } else {
      if (!guestInfo.name || !guestInfo.name.trim()) {
        errors.push('guestInfo.name is required for guest donations');
      }
      if (!guestInfo.email || !EMAIL_REGEX.test(guestInfo.email)) {
        errors.push('guestInfo.email must be a valid email for guest donations');
      }
    }
  }

  if (message !== undefined && (typeof message !== 'string' || message.length > 500)) {
    errors.push('message must be a string of at most 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

function validateVerifyPayment(req, res, next) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const errors = [];

  if (!razorpay_order_id || typeof razorpay_order_id !== 'string') {
    errors.push('razorpay_order_id is required');
  }
  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string') {
    errors.push('razorpay_payment_id is required');
  }
  if (!razorpay_signature || typeof razorpay_signature !== 'string') {
    errors.push('razorpay_signature is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

module.exports = { validateCreateOrder, validateVerifyPayment };
