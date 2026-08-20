const mongoose = require('mongoose');

const Campaign = require('../models/Campaign');
const NGO = require('../models/NGO');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const uploadBufferToCloudinary = require('../utils/cloudinaryUpload');

const PUBLIC_STATUSES = ['active', 'closed', 'completed'];
const UPDATABLE_FIELDS = ['title', 'description', 'category', 'goalAmount', 'endDate', 'status'];

async function findOwnedNgoOrThrow(userId) {
  const ngo = await NGO.findOne({ admin: userId });
  if (!ngo) {
    const error = new Error('You must create an NGO profile before creating a campaign');
    error.statusCode = 400;
    throw error;
  }
  if (ngo.approvalStatus !== 'approved') {
    const error = new Error('Your NGO must be approved before you can create campaigns');
    error.statusCode = 403;
    throw error;
  }
  return ngo;
}

function isOwnerOrSuperAdmin(campaign, user) {
  if (user.role === 'super_admin') return true;
  // campaign.ngo.admin may be a populated User doc (has _id) or a raw ObjectId.
  const adminId = campaign.ngo.admin._id || campaign.ngo.admin;
  return adminId.toString() === user._id.toString();
}

async function uploadCoverImageIfPresent(req) {
  if (!req.file) return undefined;
  const result = await uploadBufferToCloudinary(req.file.buffer, { folder: 'fundflow/campaigns' });
  return result.secure_url;
}

const createCampaign = asyncHandler(async (req, res) => {
  const ngo = await findOwnedNgoOrThrow(req.user._id);

  const { title, description, category, goalAmount, endDate, status } = req.body;
  const coverImageUrl = await uploadCoverImageIfPresent(req);

  const campaign = await Campaign.create({
    ngo: ngo._id,
    title,
    slug: slugify(title),
    description,
    category,
    goalAmount,
    endDate: endDate || undefined,
    status: status || 'draft',
    coverImageUrl,
  });

  res.status(201).json({ success: true, campaign });
});

async function loadOwnedCampaignOrThrow(id, user) {
  const campaign = await Campaign.findById(id).populate('ngo', 'admin approvalStatus name');
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.statusCode = 404;
    throw error;
  }
  if (!isOwnerOrSuperAdmin(campaign, user)) {
    const error = new Error('Forbidden: you do not own this campaign');
    error.statusCode = 403;
    throw error;
  }
  return campaign;
}

const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await loadOwnedCampaignOrThrow(req.params.id, req.user);

  UPDATABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      campaign[field] = req.body[field];
    }
  });

  const coverImageUrl = await uploadCoverImageIfPresent(req);
  if (coverImageUrl) {
    campaign.coverImageUrl = coverImageUrl;
  }

  await campaign.save();
  res.status(200).json({ success: true, campaign });
});

const closeCampaign = asyncHandler(async (req, res) => {
  const campaign = await loadOwnedCampaignOrThrow(req.params.id, req.user);

  campaign.status = 'closed';
  await campaign.save();

  res.status(200).json({ success: true, campaign });
});

// Accepts either a Mongo ObjectId or a slug.
const getCampaign = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

  const campaign = await Campaign.findOne(query).populate('ngo', 'name approvalStatus admin logoUrl');
  if (!campaign) {
    const error = new Error('Campaign not found');
    error.statusCode = 404;
    throw error;
  }

  const isPubliclyVisible = PUBLIC_STATUSES.includes(campaign.status);
  const isPrivileged = req.user && isOwnerOrSuperAdmin(campaign, req.user);

  if (!isPubliclyVisible && !isPrivileged) {
    const error = new Error('Campaign not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({ success: true, campaign });
});

const listCampaigns = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 100);

  const filter = {};

  if (req.query.status) {
    if (!PUBLIC_STATUSES.includes(req.query.status)) {
      const error = new Error(`status filter must be one of: ${PUBLIC_STATUSES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    filter.status = req.query.status;
  } else {
    filter.status = { $in: PUBLIC_STATUSES };
  }

  // typeof guards, not just the global sanitize middleware: sanitize strips
  // "$"-prefixed keys (blocks operator injection) but a query param can
  // still arrive as an array (?category=a&category=a again) rather than a
  // string, which would reach a raw regex/filter assignment below and either
  // misbehave or throw — belt-and-suspenders for input that isn't malicious,
  // just the wrong shape.
  if (req.query.category && typeof req.query.category === 'string') {
    filter.category = req.query.category;
  }

  // Plain regex search, not a $text index: with no MongoDB text index on
  // title/description, this is an unindexed collection scan — acceptable at
  // this project's scale, but worth flagging as the first thing to revisit
  // (migrate to a $text index + $text query) if campaign search ever needs
  // to perform well against a large collection.
  if (req.query.search && typeof req.query.search === 'string') {
    const term = req.query.search.trim();
    if (term) {
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: regex }, { description: regex }];
    }
  }

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .populate('ngo', 'name logoUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Campaign.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    campaigns,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ngo_admin's own campaigns, including drafts — not exposed via the public
// list/search endpoint.
const listMyCampaigns = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ admin: req.user._id });
  if (!ngo) {
    return res.status(200).json({ success: true, campaigns: [] });
  }

  const campaigns = await Campaign.find({ ngo: ngo._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, campaigns });
});

module.exports = {
  createCampaign,
  updateCampaign,
  closeCampaign,
  getCampaign,
  listCampaigns,
  listMyCampaigns,
};
