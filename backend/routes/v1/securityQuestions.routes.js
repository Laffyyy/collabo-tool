const { Router } = require('express');
const { body, param } = require('express-validator');
const SecurityQuestionsController = require('../../controllers/securityQuestions.controller');
const { validate } = require('../../utils/validate');

const router = Router();

// Get all available security questions
router.get('/questions', SecurityQuestionsController.getAllQuestions);

// Save user's security question answers (first-time setup)
router.post(
  '/user-answers',
  [
    // Changed back to isUUID() for UUID user IDs
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('questionAnswers')
      .isArray({ min: 3, max: 5 })
      .withMessage('Question answers must be an array with 3-5 items'),
    body('questionAnswers.*.questionId')
      // Changed back to isUUID() for UUID question IDs
      .isUUID()
      .withMessage('Each question must have a valid question ID'),
    body('questionAnswers.*.answer')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each answer must be 1-100 characters long')
  ],
  validate,
  SecurityQuestionsController.saveUserAnswers
);

// Get user's security questions (without answers) - for password reset flow
router.get(
  '/user-questions/:userId',
  [
    // Changed back to isUUID()
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validate,
  SecurityQuestionsController.getUserQuestions
);

// Verify user's security answers - for password reset flow
router.post(
  '/verify-answers',
  [
    // Changed back to isUUID()
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('questionAnswers')
      .isArray({ min: 1 })
      .withMessage('Question answers array is required'),
    body('questionAnswers.*.questionId')
      // Changed back to isUUID()
      .isUUID()
      .withMessage('Each question must have a valid question ID'),
    body('questionAnswers.*.answer')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Each answer is required')
  ],
  validate,
  SecurityQuestionsController.verifyAnswers
);

// Check if user has security answers set up
router.get(
  '/user-status/:userId',
  [
    // Changed back to isUUID()
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validate,
  SecurityQuestionsController.checkUserAnswers
);

module.exports = router;