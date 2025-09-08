const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile, 
  logout 
} = require('../controllers/authController');
const { googleAuth, googleAuthCallback } = require('../controllers/googleAuthController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

// Google OAuth Routes
router.post('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Logout route
router.get('/logout', auth, logout);

module.exports = router;