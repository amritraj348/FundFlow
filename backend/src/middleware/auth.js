const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');

// Verifies the access token and attaches the user document to req.user.
// Must run before any authorize(...) middleware on a route.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    const error = new Error('Not authorized, no token provided');
    error.statusCode = 401;
    throw error;
  }

  const token = header.slice('Bearer '.length);

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const error = new Error('Not authorized, invalid or expired token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    const error = new Error('Not authorized, user no longer exists');
    error.statusCode = 401;
    throw error;
  }

  req.user = user;
  next();
});

module.exports = protect;
