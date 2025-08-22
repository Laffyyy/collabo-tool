const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../../controllers/auth.controller');
const { validate } = require('../../utils/validate');
const { requireAuth } = require('../../auth/requireAuth');

const router = Router();

// Login
router.post(
  '/login',
  [body('username').isString().notEmpty(), body('password').isString().notEmpty()],
  validate,
  authController.login
);

// OTP Verify
router.post(
  '/otp',
  [
    body('username').isString().notEmpty(),
    body('userId').isString().notEmpty(), // Add validation for userId
    body('otp').isString().isLength({ min: 4, max: 8 })
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  [body('username').isString().notEmpty()],
  validate,
  authController.resendOtp
);

// First Time Setup
router.post(
  '/setup',
  [body('username').isString().notEmpty(), body('password').isString().isLength({ min: 8 })],
  validate,
  authController.firstTimeSetup
);

// Change Password
router.put(
  '/password',
  requireAuth,
  [body('currentPassword').isString().notEmpty(), body('newPassword').isString().isLength({ min: 8 })],
  validate,
  authController.changePassword
);

// Set Security Questions
router.post(
  '/security-questions',
  requireAuth,
  [body('questions').isArray({ min: 1 })],
  validate,
  authController.setSecurityQuestions
);

// Forgot Password
router.post(
  '/forgot-password',
  [body('username').isString().notEmpty()],
  validate,
  authController.forgotPassword
);

// Add this route after the existing forgot-password route
router.post(
  '/reset-password',
  [
    body('token').isString().notEmpty().withMessage('Reset token is required'),
    body('newPassword').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ],
  validate,
  authController.resetPassword
);

// Add this route after the reset-password route
router.post(
  '/validate-reset-token',
  [
    body('token').isString().notEmpty().withMessage('Reset token is required')
  ],
  validate,
  authController.validateResetToken
);

// Send Reset Password Link
router.post(
  '/send-reset-link',
  [body('username').isString().notEmpty()],
  validate,
  authController.sendResetLink
);

// Answer Security Questions
router.post(
  '/answer-security-questions',
  [body('username').isString().notEmpty(), body('answers').isArray({ min: 1 })],
  validate,
  authController.answerSecurityQuestions
);

// Logout
router.post(
  '/logout',
  requireAuth,
  authController.logout
);

module.exports = router;

