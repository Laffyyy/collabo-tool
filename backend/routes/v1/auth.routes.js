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

// Validate Session
router.get(
  '/validate-session',
  requireAuth,  // This middleware will check if the session is valid
  (req, res) => {
    // If requireAuth passes, session is valid
    res.status(200).json({ valid: true });
  }
);

// Get session info
router.get(
  '/session-info',
  requireAuth,
  authController.getSessionInfo
);

// Refresh session
router.post(
  '/refresh-session',
  requireAuth,
  authController.refreshSession
);

module.exports = router;

