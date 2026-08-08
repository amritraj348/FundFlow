const CREATABLE_STATUSES = ['draft', 'active'];

function validateCreateCampaign(req, res, next) {
  const { title, description, goalAmount, endDate, status } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Title is required');
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    errors.push('Description is required');
  }
  const goal = Number(goalAmount);
  if (!goalAmount || Number.isNaN(goal) || goal <= 0) {
    errors.push('goalAmount must be a positive number');
  }
  if (endDate !== undefined && endDate !== '' && Number.isNaN(Date.parse(endDate))) {
    errors.push('endDate must be a valid date');
  }
  if (endDate && !Number.isNaN(Date.parse(endDate)) && new Date(endDate) <= new Date()) {
    errors.push('endDate must be in the future');
  }
  if (status !== undefined && !CREATABLE_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${CREATABLE_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

function validateUpdateCampaign(req, res, next) {
  const { title, description, goalAmount, endDate, status } = req.body;
  const errors = [];

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    errors.push('Title cannot be empty');
  }
  if (description !== undefined && (typeof description !== 'string' || !description.trim())) {
    errors.push('Description cannot be empty');
  }
  if (goalAmount !== undefined) {
    const goal = Number(goalAmount);
    if (Number.isNaN(goal) || goal <= 0) {
      errors.push('goalAmount must be a positive number');
    }
  }
  if (endDate !== undefined && endDate !== '' && Number.isNaN(Date.parse(endDate))) {
    errors.push('endDate must be a valid date');
  }
  if (status !== undefined && !CREATABLE_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${CREATABLE_STATUSES.join(', ')} (use the close endpoint to close a campaign)`);
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors.join('; ') });
  }
  next();
}

module.exports = { validateCreateCampaign, validateUpdateCampaign };
