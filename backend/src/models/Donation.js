const { Schema, model } = require('mongoose');

const donationSchema = new Schema(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
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

module.exports = model('Donation', donationSchema);
