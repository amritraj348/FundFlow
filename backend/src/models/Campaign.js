const { Schema, model } = require('mongoose');

const campaignSchema = new Schema(
  {
    ngo: {
      type: Schema.Types.ObjectId,
      ref: 'NGO',
      required: true,
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

module.exports = model('Campaign', campaignSchema);
