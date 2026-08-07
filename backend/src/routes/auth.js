const express = require('express');

const { register, login, refresh, me } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const { authLimiter } = require('../middleware/rateLimiter');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', protect, me);

module.exports = router;
