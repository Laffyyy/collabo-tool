const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const broadcastController = require('../../controllers/upload-broadcast.controller');
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');
const { validate } = require('../../utils/validate');

// Only allow admin and manager to create broadcasts
const canCreateBroadcast = requireRole(['admin', 'manager']);

/**
 * @route   GET /api/v1/broadcast/ou
 * @desc    Get all organizational units for broadcast targeting
 * @access  Private
 */
router.get(
  '/ou',
  requireAuth,
  broadcastController.getOrganizationalUnits
);

/**
 * @route   GET /api/v1/broadcast/roles
 * @desc    Get all roles for broadcast targeting
 * @access  Private
 */
router.get(
  '/roles',
  requireAuth,
  broadcastController.getRoles
);

/**
 * @route   POST /api/v1/broadcast
 * @desc    Create a new broadcast
 * @access  Private (Admin/Manager only)
 */
router.post(
  '/',
  requireAuth,
  canCreateBroadcast,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Broadcast title is required')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Broadcast content is required'),
    body('priority')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('targetRoles')
      .isArray({ min: 1 })
      .withMessage('At least one target role is required'),
    body('targetOUs')
      .isArray({ min: 1 })
      .withMessage('At least one organizational unit is required')
  ],
  validate,
  broadcastController.createBroadcast
);

module.exports = router;