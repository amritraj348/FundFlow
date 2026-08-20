const { Schema, model } = require('mongoose');

const campaignSchema = new Schema(
  {
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
      // listMyCampaigns, ownership checks, and the analytics topCampaigns
      // lookup all query/join on this.
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      trim: true,
    },
    coverImageUrl: {
      type: String,
    },
    goalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    raisedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    donorCount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'completed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// Covers the public listing's dominant query shape (listCampaigns): filter
// by status, optionally by category, sorted by createdAt desc. A status-only
// or status+category query can both use a prefix of this same compound
// index, so one index serves both. Free-text search still falls back to an
// unindexed regex scan on title/description — see the note on `search` in
// campaignController.js for why that's an accepted trade-off for now.
campaignSchema.index({ status: 1, category: 1, createdAt: -1 });

module.exports = model('Campaign', campaignSchema);
