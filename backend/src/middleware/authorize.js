// Role gate — use after protect. authorize('ngo_admin', 'super_admin') etc.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      const error = new Error('Forbidden: you do not have permission to perform this action');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
}

module.exports = authorize;
