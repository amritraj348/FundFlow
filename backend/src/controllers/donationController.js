const crypto = require('crypto');

const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const razorpay = require('../config/razorpay');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const { campaignId, amount, isAnonymous, guestInfo } = req.body;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.statusCode = 404;
    throw error;
  }
  if (campaign.status !== 'active') {
    const error = new Error('This campaign is not currently accepting donations');
    error.statusCode = 400;
    throw error;
  }

  // Razorpay wants the smallest currency unit (paise for INR).
  const amountPaise = Math.round(Number(amount) * 100);

  let order;
  try {
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: campaign.currency || 'INR',
      receipt: `don_${Date.now()}`,
      notes: {
        campaignId: campaign._id.toString(),
        donorId: req.user ? req.user._id.toString() : 'guest',
      },
    });
  } catch (err) {
    const message = err?.error?.description || 'Unable to create payment order';
    const error = new Error(message);
    error.statusCode = 502;
    throw error;
  }

  // Donation is recorded as "pending" the moment we have a Razorpay order —
  // verify-payment is what flips it to success/failed once checkout completes.
  const donation = await Donation.create({
    donor: req.user ? req.user._id : undefined,
    campaign: campaign._id,
    ngo: campaign.ngo,
    amount: Number(amount),
    currency: campaign.currency || 'INR',
    isAnonymous: Boolean(isAnonymous),
    guestInfo: req.user ? undefined : guestInfo,
    status: 'pending',
    razorpayOrderId: order.id,
  });

  res.status(201).json({
    success: true,
    donationId: donation._id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: config.razorpay.keyId,
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const donation = await Donation.findOne({ razorpayOrderId: razorpay_order_id });
  if (!donation) {
    const error = new Error('No donation found for this order');
    error.statusCode = 404;
    throw error;
  }

  if (donation.status === 'success') {
    return res.status(200).json({ success: true, donation, alreadyProcessed: true });
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(razorpay_signature, 'utf8');
  const isValid =
    expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    donation.status = 'failed';
    donation.razorpayPaymentId = razorpay_payment_id;
    await donation.save();

    const error = new Error('Payment verification failed');
    error.statusCode = 400;
    throw error;
  }

  // Atomic compare-and-swap: only the request that flips the status away
  // from "success" gets to increment the campaign totals, so a duplicate
  // verify-payment call (retry, double-click, race) can't double-count —
  // even under concurrent requests, since this is enforced at the DB level
  // rather than by the status check above.
  const updatedDonation = await Donation.findOneAndUpdate(
    { _id: donation._id, status: { $ne: 'success' } },
    {
      $set: {
        status: 'success',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    },
    { new: true }
  );

  if (updatedDonation) {
    await Campaign.findByIdAndUpdate(donation.campaign, {
      $inc: { raisedAmount: donation.amount, donorCount: 1 },
    });
  }

  const finalDonation = updatedDonation || (await Donation.findById(donation._id));

  res.status(200).json({ success: true, donation: finalDonation, alreadyProcessed: !updatedDonation });
});

const listMyDonations = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const filter = { donor: req.user._id };
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [donations, total] = await Promise.all([
    Donation.find(filter)
      .populate('campaign', 'title slug coverImageUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Donation.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    donations,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = { createOrder, verifyPayment, listMyDonations };
