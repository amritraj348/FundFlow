const express = require('express');

const {
  createNgo,
  updateNgo,
  getNgoById,
  getMyNgo,
  listNgos,
  setApprovalStatus,
} = require('../controllers/ngoController');
const { validateCreateNgo, validateUpdateNgo, validateApprovalStatus } = require('../validators/ngoValidators');
const protect = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorize = require('../middleware/authorize');

const router = express.Router();

router.get('/', optionalAuth, listNgos);
router.post('/', protect, authorize('ngo_admin'), validateCreateNgo, createNgo);
// Must come before /:id — otherwise "me" would be captured as an :id value.
router.get('/me', protect, authorize('ngo_admin'), getMyNgo);
router.get('/:id', optionalAuth, getNgoById);
router.put('/:id', protect, authorize('ngo_admin', 'super_admin'), validateUpdateNgo, updateNgo);
router.patch(
  '/:id/approval',
  protect,
  authorize('super_admin'),
  validateApprovalStatus,
  setApprovalStatus
);

module.exports = router;
