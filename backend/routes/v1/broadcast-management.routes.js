const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');
const { validate } = require('../../utils/validate');
const { param } = require('express-validator');
const broadcastManagementController = require('../../controllers/broadcast-management.controller');

/**
 * @route   GET /api/v1/broadcasts/all
 * @desc    Get all broadcasts for admin management
 * @access  Private (Admin only)
 */
router.get(
  '/all',
  requireAuth,
  requireRole(['admin']),
  broadcastManagementController.getAllBroadcasts
);

/**
 * @route   PATCH /api/v1/broadcasts/:id/archive
 * @desc    Archive a broadcast
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/archive',
  requireAuth,
  requireRole(['admin']),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid broadcast ID format')
  ],
  validate,
  broadcastManagementController.archiveBroadcast
);

/**
 * @route   PATCH /api/v1/broadcasts/:id/restore
 * @desc    Restore an archived broadcast
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/restore',
  requireAuth,
  requireRole(['admin']),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid broadcast ID format')
  ],
  validate,
  broadcastManagementController.restoreBroadcast
);

/**
 * @route   DELETE /api/v1/broadcasts/:id
 * @desc    Delete a broadcast
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  [
    param('id')
      .isUUID()
      .withMessage('Invalid broadcast ID format')
  ],
  validate,
  broadcastManagementController.deleteBroadcast
);

module.exports = router;