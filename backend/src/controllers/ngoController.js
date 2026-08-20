const NGO = require('../models/NGO');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const UPDATABLE_FIELDS = [
  'name',
  'description',
  'email',
  'phone',
  'website',
  'category',
  'registrationNumber',
  'address',
];

function isOwnerOrSuperAdmin(ngo, user) {
  if (user.role === 'super_admin') return true;
  // ngo.admin may be a populated User doc (has _id) or a raw ObjectId.
  const adminId = ngo.admin._id || ngo.admin;
  return adminId.toString() === user._id.toString();
}

// One NGO profile per ngo_admin account.
const createNgo = asyncHandler(async (req, res) => {
  const existing = await NGO.findOne({ admin: req.user._id });
  if (existing) {
    const error = new Error('You already have an NGO profile');
    error.statusCode = 409;
    throw error;
  }

  const { name, description, email, phone, website, category, registrationNumber, address } = req.body;

  const ngo = await NGO.create({
    admin: req.user._id,
    name,
    description,
    email,
    phone,
    website,
    category,
    registrationNumber,
    address,
  });

  req.user.ngo = ngo._id;
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, ngo });
});

// Self-scoped like the Phase 6 analytics endpoints — no :id param, so
// there's nothing to guess or leak. Returns ngo: null (not a 404) when the
// ngo_admin hasn't created a profile yet, since that's a normal state for
// the dashboard to render around, not an error.
const getMyNgo = asyncHandler(async (req, res) => {
  const ngo = await NGO.findOne({ admin: req.user._id });
  res.status(200).json({ success: true, ngo: ngo || null });
});

const updateNgo = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) {
    const error = new Error('NGO not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isOwnerOrSuperAdmin(ngo, req.user)) {
    const error = new Error('Forbidden: you do not own this NGO profile');
    error.statusCode = 403;
    throw error;
  }

  UPDATABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      ngo[field] = req.body[field];
    }
  });

  await ngo.save();
  res.status(200).json({ success: true, ngo });
});

const getNgoById = asyncHandler(async (req, res) => {
  // This endpoint is public for approved NGOs (optionalAuth) — populate only
  // the admin's name, never their email. Their account email isn't the
  // NGO's public contact address (the NGO has its own `email` field for
  // that) and has no reason to be exposed to anonymous visitors.
  const ngo = await NGO.findById(req.params.id).populate('admin', 'name');
  if (!ngo) {
    const error = new Error('NGO not found');
    error.statusCode = 404;
    throw error;
  }

  const isPubliclyVisible = ngo.approvalStatus === 'approved';
  const isPrivileged = req.user && isOwnerOrSuperAdmin(ngo, req.user);

  if (!isPubliclyVisible && !isPrivileged) {
    const error = new Error('NGO not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({ success: true, ngo });
});

// Public callers only ever see approved NGOs. A super_admin may pass
// ?approvalStatus= to review pending/rejected profiles for moderation.
const listNgos = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  const filter = {};
  if (req.user?.role === 'super_admin' && req.query.approvalStatus) {
    filter.approvalStatus = req.query.approvalStatus;
  } else {
    filter.approvalStatus = 'approved';
  }

  const [ngos, total] = await Promise.all([
    NGO.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    NGO.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    ngos,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// super_admin-only moderation: approve or reject an NGO's profile. A reason
// is required when rejecting (enforced by validateApprovalStatus) and is
// cleared out on any status change that doesn't supply one (e.g. approving
// after a previous rejection shouldn't leave a stale reason behind).
const setApprovalStatus = asyncHandler(async (req, res) => {
  const ngo = await NGO.findById(req.params.id);
  if (!ngo) {
    const error = new Error('NGO not found');
    error.statusCode = 404;
    throw error;
  }

  ngo.approvalStatus = req.body.approvalStatus;
  ngo.moderationReason = req.body.reason || undefined;
  await ngo.save();

  res.status(200).json({ success: true, ngo });
});

module.exports = { createNgo, updateNgo, getNgoById, getMyNgo, listNgos, setApprovalStatus };
