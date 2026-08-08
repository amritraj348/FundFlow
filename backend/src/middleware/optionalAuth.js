const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');

// Like protect, but never rejects — attaches req.user when a valid token is
// present, otherwise leaves it undefined. Used on endpoints that are public
// but behave differently for an authenticated owner/super_admin (e.g.
// letting an NGO owner preview their own pending profile).
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Invalid/expired token on an optional-auth route just falls back to
    // anonymous access rather than failing the request.
  }

  next();
});

module.exports = optionalAuth;
