/**
 * Authentication Route Definitions
 */

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { validateBody } = require('../middleware/requestValidator');
const { authenticate } = require('../middleware/auth.middleware');

// Registration validation rules
const registerRules = {
  fullName: { required: true, type: 'string', minLength: 2 },
  email: {
    required: true,
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Must be a valid email address'
  },
  phone: {
    required: true,
    type: 'string',
    pattern: /^\+?[0-9]{10,15}$/,
    patternMessage: 'Phone number must be between 10 to 15 digits'
  },
  password: {
    required: true,
    type: 'string',
    minLength: 8
  }
};

// Login validation rules
const loginRules = {
  email: { required: true, type: 'string' },
  password: { required: true, type: 'string' }
};

router.post('/register', validateBody(registerRules), AuthController.register);
router.post('/login', validateBody(loginRules), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
