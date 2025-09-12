const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const broadcastController = require('../../controllers/upload-broadcast.controller');
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');
const { validate } = require('../../utils/validate');

// Only allow admin and manager to create broadcasts
const canCreateBroadcast = requireRole(['admin', 'manager', 'support', 'supervisor']);

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
      .withMessage('At least one organizational unit is required'),
    body('scheduledFor')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('Scheduled date must be a valid date'),
    body('endDate')
      .optional({ nullable: true })
      .isISO8601()
      .withMessage('End date must be a valid date'),
    body('responseType')
      .optional()
      .isIn(['none', 'required', 'preferred-date', 'choices', 'textbox'])
      .withMessage('Invalid response type'),
    body('choices')
      .optional()
      .custom((value, { req }) => {
        if (req.body.responseType === 'choices') {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Options are required for multiple choice response type');
          }
          if (value.length > 8) {
            throw new Error('Maximum of 8 options allowed for multiple choice');
          }
          // Ensure all choices are strings and not empty
          for (const choice of value) {
            if (typeof choice !== 'string' || choice.trim() === '') {
              throw new Error('All options must be non-empty strings');
            }
          }
        }
        return true;
      })
  ],
  validate,
  broadcastController.createBroadcast
);

/**
 * @route   POST /api/v1/broadcast/templates
 * @desc    Save a broadcast template
 * @access  Private (Admin/Manager only)
 */
router.post(
  '/templates',
  requireAuth,
  canCreateBroadcast,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Template name is required')
      .isLength({ max: 255 })
      .withMessage('Template name cannot exceed 255 characters'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Template title is required')
      .isLength({ max: 255 })
      .withMessage('Title cannot exceed 255 characters'),
    body('content')
      .trim()
      .notEmpty()
      .withMessage('Template content is required'),
    body('priority')
      .isIn(['low', 'medium', 'high'])
      .withMessage('Priority must be low, medium, or high'),
    body('targetOUs')
      .optional()
      .isArray()
      .withMessage('Target OUs must be an array'),
    body('targetRoles')
      .optional()
      .isArray()
      .withMessage('Target roles must be an array'),
    body('acknowledgmentType')
      .optional()
      .isIn(['none', 'required', 'preferred-date', 'choices', 'textbox'])
      .withMessage('Invalid acknowledgment type'),
    body('choices')
      .optional()
      .custom((value, { req }) => {
        if (req.body.acknowledgmentType === 'choices') {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Options are required for multiple choice templates');
          }
          if (value.length > 8) {
            throw new Error('Maximum of 8 options allowed for multiple choice');
          }
          // Ensure all choices are strings and not empty
          for (const choice of value) {
            if (typeof choice !== 'string' || choice.trim() === '') {
              throw new Error('All options must be non-empty strings');
            }
          }
        }
        return true;
      }),
  ],
  validate,
  broadcastController.saveTemplate
);

/**
 * @route   GET /api/v1/broadcast/templates
 * @desc    Get broadcast templates
 * @access  Private
 */
router.get(
  '/templates',
  requireAuth,
  broadcastController.getTemplates
);

/**
 * @route   DELETE /api/v1/broadcast/templates/:id
 * @desc    Delete a broadcast template
 * @access  Private (Admin/Manager only)
 */
router.delete(
  '/templates/:id',
  requireAuth,
  canCreateBroadcast,
  broadcastController.deleteTemplate
);

module.exports = router;