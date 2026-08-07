// Wraps an async route/middleware fn so rejected promises reach the
// centralized error handler instead of needing a try/catch in every one.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
