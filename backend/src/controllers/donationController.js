const crypto = require('crypto');

const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const razorpay = require('../config/razorpay');
const config = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const { sendDonationNotifications } = require('../utils/donationNotifications');
const { loadDonationForReceipt, buildReceiptNumber, generateReceiptPdf } = require('../utils/receipt');

const createOrder = asyncHandler(async (req, res) => {
  const { campaignId, amount, isAnonymous, guestInfo, message } = req.body;

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
    message: message || undefined,
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

  // Atomic compare-and-swap, shared with the webhook handler: only the
  // request that flips the status away from "success" gets to increment the
  // campaign totals, so a duplicate verify-payment call (retry, double-click,
  // race — or the webhook beating us to it) can't double-count, since this
  // is enforced at the DB level rather than by the status check above.
  const { finalDonation, alreadyProcessed } = await markDonationSuccessOnce(
    donation,
    razorpay_payment_id,
    razorpay_signature
  );

  res.status(200).json({ success: true, donation: finalDonation, alreadyProcessed });
});

// Applies the same atomic compare-and-swap used in verifyPayment: only the
// call that flips status away from "success" gets to increment campaign
// totals. Shared here so verify-payment and the webhook can race freely —
// whichever arrives first wins, the other is a no-op.
async function markDonationSuccessOnce(donation, paymentId, signature) {
  const fields = { status: 'success', razorpayPaymentId: paymentId };
  if (signature) {
    fields.razorpaySignature = signature;
  }

  const updatedDonation = await Donation.findOneAndUpdate(
    { _id: donation._id, status: { $ne: 'success' } },
    { $set: fields },
    { new: true }
  );

  if (updatedDonation) {
    await Campaign.findByIdAndUpdate(donation.campaign, {
      $inc: { raisedAmount: donation.amount, donorCount: 1 },
    });

    // Fire-and-forget: the donation/webhook response shouldn't wait on PDF
    // generation + SMTP round trips, and a failed email must never fail this
    // request. Gated on updatedDonation being truthy means this only ever
    // runs on the one call that actually flipped the status — the same
    // guard that prevents double-counting also prevents double-sending.
    sendDonationNotifications(updatedDonation._id).catch((err) => {
      console.error(`[notifications] Unhandled error for donation ${updatedDonation._id}:`, err);
    });
  }

  return { finalDonation: updatedDonation || donation, alreadyProcessed: !updatedDonation };
}

// Razorpay calls this server-to-server on payment lifecycle events. It's the
// durable source of truth for payment status — verify-payment (the
// client-driven checkout callback) is a best-effort fast path, but a user
// closing their browser before it fires, or the request failing to reach us,
// must not leave a successful payment stuck as "pending". Both paths share
// the same atomic guard so whichever arrives first wins and neither can
// double-count.
const handleWebhook = asyncHandler(async (req, res) => {
  if (!config.razorpay.webhookSecret) {
    const error = new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
    error.statusCode = 500;
    throw error;
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || !req.rawBody) {
    return res.status(400).json({ success: false, message: 'Missing webhook signature or body' });
  }

  const expectedSignature = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(req.rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');
  const isValid =
    expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const { event } = req.body;
  const paymentEntity = req.body?.payload?.payment?.entity;

  if (!paymentEntity?.order_id) {
    // Nothing actionable (e.g. an event type we don't handle) — ack so
    // Razorpay doesn't retry.
    return res.status(200).json({ success: true, message: 'Event ignored' });
  }

  const donation = await Donation.findOne({ razorpayOrderId: paymentEntity.order_id });
  if (!donation) {
    // Could be a genuine race with create-order (webhook beat our own write
    // to the DB), or an order from another integration. Either way, erroring
    // here just makes Razorpay retry with the same problem — log and ack.
    console.warn(`[webhook] No donation found for order ${paymentEntity.order_id} (event: ${event})`);
    return res.status(200).json({ success: true, message: 'Donation not found, acknowledged' });
  }

  if (event === 'payment.captured') {
    await markDonationSuccessOnce(donation, paymentEntity.id);
  } else if (event === 'payment.failed') {
    // Only demote created/pending — never overwrite an already-successful
    // or already-failed donation.
    await Donation.findOneAndUpdate(
      { _id: donation._id, status: { $nin: ['success', 'failed'] } },
      { $set: { status: 'failed', razorpayPaymentId: paymentEntity.id } }
    );
  }

  res.status(200).json({ success: true });
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

// Regenerates the PDF on demand rather than serving a stored file — PDFKit
// generation is cheap and deterministic from the donation record, so there's
// nothing to keep in sync and no separate file storage to manage.
const getReceipt = asyncHandler(async (req, res) => {
  const donation = await loadDonationForReceipt(req.params.id);
  if (!donation) {
    const error = new Error('Donation not found');
    error.statusCode = 404;
    throw error;
  }

  const isOwner = donation.donor && donation.donor._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'super_admin') {
    const error = new Error('Forbidden: you do not own this donation');
    error.statusCode = 403;
    throw error;
  }

  if (donation.status !== 'success') {
    const error = new Error('Receipt not available until payment is confirmed');
    error.statusCode = 400;
    throw error;
  }

  const pdfBuffer = await generateReceiptPdf(donation);
  const receiptNumber = buildReceiptNumber(donation);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="FundFlow-Receipt-${receiptNumber}.pdf"`);
  res.send(pdfBuffer);
});

module.exports = { createOrder, verifyPayment, handleWebhook, listMyDonations, getReceipt };
