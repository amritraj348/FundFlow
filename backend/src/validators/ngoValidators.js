const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;

function validateCreateNgo(req, res, next) {
  const { name, email, website } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Name is required');
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push('A valid email is required');
  }
  if (website && !URL_REGEX.test(website)) {
    errors.push('Website must be a valid URL starting with http:// or https://');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

function validateUpdateNgo(req, res, next) {
  const { email, website } = req.body;
  const errors = [];

  if (email !== undefined && !EMAIL_REGEX.test(email)) {
    errors.push('A valid email is required');
  }
  if (website && !URL_REGEX.test(website)) {
    errors.push('Website must be a valid URL starting with http:// or https://');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

function validateApprovalStatus(req, res, next) {
  const { approvalStatus, reason } = req.body;
  const allowed = ['pending', 'approved', 'rejected'];
  const errors = [];

  if (!approvalStatus || !allowed.includes(approvalStatus)) {
    errors.push(`approvalStatus must be one of: ${allowed.join(', ')}`);
  }
  if (approvalStatus === 'rejected' && (!reason || !reason.trim())) {
    errors.push('A reason is required when rejecting an NGO');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

module.exports = { validateCreateNgo, validateUpdateNgo, validateApprovalStatus };
