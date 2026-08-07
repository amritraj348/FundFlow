const bcrypt = require('bcrypt');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const REFRESH_TOKEN_HASH_ROUNDS = 10;

// Public registration may only create donor / ngo_admin accounts —
// super_admin is provisioned out-of-band (e.g. seeded directly in the DB).
const SELF_REGISTERABLE_ROLES = ['donor', 'ngo_admin'];

function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshToken = await bcrypt.hash(refreshToken, REFRESH_TOKEN_HASH_ROUNDS);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: SELF_REGISTERABLE_ROLES.includes(role) ? role : 'donor',
  });

  const { accessToken, refreshToken } = await issueTokens(user);

  res.status(201).json({
    success: true,
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  res.status(200).json({
    success: true,
    user: toSafeUser(user),
    accessToken,
    refreshToken,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 400;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  const matches = user?.refreshToken && (await bcrypt.compare(refreshToken, user.refreshToken));
  if (!matches) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = signAccessToken(user);
  res.status(200).json({ success: true, accessToken });
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: toSafeUser(req.user) });
});

module.exports = { register, login, refresh, me };
