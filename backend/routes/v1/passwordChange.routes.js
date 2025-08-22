const { Router } = require('express');
const { body, param } = require('express-validator');
const PasswordChangeController = require('../../controllers/passwordChange.controller');

const router = Router();

// Check if user needs to change password
router.get(
  '/check-required/:userId',
  [
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  PasswordChangeController.checkPasswordChangeRequired
);

// Change password after security question verification
router.post(
  '/change-password',
  [
    body('userId')
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be 8-128 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('securityAnswers')
      .optional()
      .isArray({ min: 1 })
      .withMessage('Security answers must be an array'),
    body('securityAnswers.*.questionId')
      .if(body('securityAnswers').exists())
      .isUUID()
      .withMessage('Each question must have a valid question ID'),
    body('securityAnswers.*.answer')
      .if(body('securityAnswers').exists())
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Each answer is required')
  ],
  PasswordChangeController.changePasswordAfterSecurityQuestions
);

module.exports = router;