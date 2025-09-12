const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const responseBroadcastController = require('../../controllers/response-broadcast.controller');
const { requireAuth } = require('../../auth/requireAuth');
const { validate } = require('../../utils/validate');

/**
 * @route   POST /api/v1/broadcast-responses/:broadcastId/acknowledge
 * @desc    Submit acknowledgment for a broadcast
 * @access  Private
 */
router.post(
  '/:broadcastId/acknowledge',
  requireAuth,
  responseBroadcastController.submitAcknowledgment
);

/**
 * @route   POST /api/v1/broadcast-responses/:broadcastId/preferred-date
 * @desc    Submit preferred date response
 * @access  Private
 */
router.post(
  '/:broadcastId/preferred-date',
  requireAuth,
  [
    body('preferredDate')
      .notEmpty()
      .withMessage('Preferred date is required')
      .isISO8601()
      .withMessage('Invalid date format. Use ISO 8601 format.')
  ],
  validate,
  responseBroadcastController.submitPreferredDate
);

/**
 * @route   POST /api/v1/broadcast-responses/:broadcastId/choice
 * @desc    Submit choice response
 * @access  Private
 */
router.post(
  '/:broadcastId/choice',
  requireAuth,
  [
    body('selectedChoice')
      .trim()
      .notEmpty()
      .withMessage('Choice selection is required')
      .isLength({ max: 500 })
      .withMessage('Choice cannot exceed 500 characters')
  ],
  validate,
  responseBroadcastController.submitChoiceResponse
);

/**
 * @route   POST /api/v1/broadcast-responses/:broadcastId/text
 * @desc    Submit text response
 * @access  Private
 */
router.post(
  '/:broadcastId/text',
  requireAuth,
  [
    body('textResponse')
      .trim()
      .notEmpty()
      .withMessage('Text response is required')
      .isLength({ max: 2000 })
      .withMessage('Text response cannot exceed 2000 characters')
  ],
  validate,
  responseBroadcastController.submitTextResponse
);

/**
 * @route   GET /api/v1/broadcast-responses/:broadcastId/responses
 * @desc    Get all responses for a broadcast (creator only)
 * @access  Private
 */
router.get(
  '/:broadcastId/responses',
  requireAuth,
  responseBroadcastController.getBroadcastResponses
);

/**
 * @route   GET /api/v1/broadcast-responses/:broadcastId/my-response
 * @desc    Get user's response for a broadcast
 * @access  Private
 */
router.get(
  '/:broadcastId/my-response',
  requireAuth,
  responseBroadcastController.getUserResponse
);

/**
 * @route   GET /api/v1/broadcast-responses/:broadcastId/stats
 * @desc    Get response statistics for a broadcast
 * @access  Private
 */
router.get(
  '/:broadcastId/stats',
  requireAuth,
  responseBroadcastController.getResponseStats
);

/**
 * @route   DELETE /api/v1/broadcast-responses/:broadcastId/my-response
 * @desc    Delete user's response for a broadcast
 * @access  Private
 */
router.delete(
  '/:broadcastId/my-response',
  requireAuth,
  responseBroadcastController.deleteUserResponse
);

module.exports = router;