const express = require('express');

const {
  createCampaign,
  updateCampaign,
  closeCampaign,
  getCampaign,
  listCampaigns,
  listMyCampaigns,
} = require('../controllers/campaignController');
const { validateCreateCampaign, validateUpdateCampaign } = require('../validators/campaignValidators');
const protect = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const authorize = require('../middleware/authorize');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', listCampaigns);
router.get('/mine', protect, authorize('ngo_admin'), listMyCampaigns);
router.post(
  '/',
  protect,
  authorize('ngo_admin'),
  upload.single('image'),
  validateCreateCampaign,
  createCampaign
);
router.get('/:idOrSlug', optionalAuth, getCampaign);
router.put(
  '/:id',
  protect,
  authorize('ngo_admin', 'super_admin'),
  upload.single('image'),
  validateUpdateCampaign,
  updateCampaign
);
router.patch('/:id/close', protect, authorize('ngo_admin', 'super_admin'), closeCampaign);

module.exports = router;
