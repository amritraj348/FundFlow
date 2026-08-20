const { Schema, model } = require('mongoose');

const donationSchema = new Schema(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      // listMyDonations queries + sorts by this.
      index: true,
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    guestInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
    },
    status: {
      type: String,
      enum: ['created', 'pending', 'success', 'failed', 'refunded'],
      default: 'created',
    },
    razorpayOrderId: {
      type: String,
      // verify-payment and the webhook both look a donation up by this on
      // every single payment confirmation — the single most performance-
      // critical index in the schema. unique because each donation gets
      // exactly one Razorpay order, never shared or reused; sparse so it
      // doesn't collide on documents from before this field existed.
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    receiptUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

// The Phase 6 analytics aggregations all start with a $match on status
// (usually 'success') and then a createdAt range within each $facet branch
// — for the NGO-scoped endpoint that's also filtered by ngo first. These
// compound indexes cover both shapes; donor/campaign/ngo above already
// exist individually for the simpler lookups (listMyDonations, receipts).
donationSchema.index({ ngo: 1, status: 1, createdAt: 1 });
donationSchema.index({ status: 1, createdAt: 1 });

module.exports = model('Donation', donationSchema);
