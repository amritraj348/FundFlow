const { Schema, model } = require('mongoose');

const ngoSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // One NGO per admin — createNgo already checks this at the app level,
      // but that check-then-create has a race window between two concurrent
      // requests; a unique index makes the DB reject the second write
      // outright (surfaces as the existing E11000 -> 409 handling in
      // errorHandler.js) instead of relying solely on the app-level check.
      // Also serves as the lookup index for findOwnedNgoOrThrow/getMyNgo/
      // analytics, which all query by admin on nearly every ngo_admin request.
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
    category: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    moderationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Public listing and the moderation queue both filter by approvalStatus and
// sort by createdAt (listNgos, the super admin moderation views).
ngoSchema.index({ approvalStatus: 1, createdAt: -1 });

module.exports = model('NGO', ngoSchema);
