const express = require('express');

const {
  createNgo,
  updateNgo,
  getNgoById,
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
