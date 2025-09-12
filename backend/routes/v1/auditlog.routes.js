const { Router } = require('express');
const { body, query, param } = require('express-validator');
const AuditLogController = require('../../controllers/auditlog.controller');
// const requireAuth = require('../../auth/requireAuth'); // Disabled for testing

const router = Router();

// Validation middleware
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('category')
    .optional()
    .isIn(['all', 'chat', 'broadcast', 'user-management', 'ou-management', 'global-config', 'security', 'system'])
    .withMessage('Invalid category'),
  query('search')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Search term cannot exceed 500 characters')
];

const validateCreateLog = [
  body('userId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid user ID is required'),
  body('action')
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .withMessage('Action is required and must be between 1-100 characters'),
  body('category')
    .notEmpty()
    .isIn(['chat', 'broadcast', 'user-management', 'ou-management', 'global-config', 'security', 'system'])
    .withMessage('Valid category is required'),
  body('targetType')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Target type cannot exceed 50 characters'),
  body('targetId')
    .optional()
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('target')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Target cannot exceed 200 characters'),
  body('details')
    .notEmpty()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Details are required and must be between 1-1000 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('success')
    .optional()
    .isBoolean()
    .withMessage('Success must be a boolean'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
];

const validateExport = [
  query('format')
    .optional()
    .isIn(['csv', 'xlsx'])
    .withMessage('Format must be csv or xlsx'),
  query('category')
    .optional()
    .isIn(['all', 'chat', 'broadcast', 'user-management', 'ou-management', 'global-config', 'security', 'system'])
    .withMessage('Invalid category'),
  query('search')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Search term cannot exceed 500 characters')
];

// Routes

/**
 * GET /api/auditlogs
 * Get audit logs with pagination and filtering
 * Query params: page, limit, category, search
 */
router.get('/', 
  validatePagination, 
  AuditLogController.getLogs
);

/**
 * GET /api/auditlogs/counts
 * Get category counts for dashboard tabs
 */
router.get('/counts', 
  AuditLogController.getCategoryCounts
);

/**
 * GET /api/auditlogs/export
 * Export audit logs as CSV or XLSX
 * Query params: format, category, search
 */
router.get('/export', 
  validateExport, 
  AuditLogController.getLogsForExport
);

/**
 * GET /api/auditlogs/:id
 * Get a specific audit log by ID
 */
router.get('/:id', 
  param('id').isUUID().withMessage('Invalid audit log ID'),
  AuditLogController.getLogById
);

/**
 * POST /api/auditlogs
 * Create a new audit log entry
 */
router.post('/', 
  validateCreateLog, 
  AuditLogController.createLog
);

module.exports = router;
