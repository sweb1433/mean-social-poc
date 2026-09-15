const express = require('express');
const rateLimit = require('express-rate-limit');
const { signup, login } = require('../controllers/auth.controller');
const { signupValidator, loginValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate.middleware');

const router = express.Router();

// Brute-force / abuse guard on auth endpoints - keeps request volume (and
// therefore compute/DB load) predictable on a small free-tier instance.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

router.post('/signup', authLimiter, signupValidator, validate, signup);
router.post('/login', authLimiter, loginValidator, validate, login);

module.exports = router;
