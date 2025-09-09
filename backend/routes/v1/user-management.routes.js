const { Router } = require('express');
const { body, query, param } = require('express-validator');
const userManagementController = require('../../controllers/user-management.controller');
const { validate } = require('../../utils/validate');
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');

const router = Router();

// Apply authentication middleware to all routes
// TEMPORARILY DISABLED FOR TESTING
// router.use(requireAuth);

// Get all users with filtering and pagination
router.get(
  '/',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('ou').optional().isString(),
    query('role').optional().isString(),
    query('status').optional().isString(),
    query('sortBy').optional().isIn(['employeeId', 'name', 'email', 'ou', 'role', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validate,
  userManagementController.getUsers
);

// Get user by ID
router.get(
  '/:id',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [param('id').isString().notEmpty()],
  validate,
  userManagementController.getUserById
);

// Create new user
router.post(
  '/',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    body('employeeId').isString().notEmpty().withMessage('Employee ID is required'),
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('ou').optional({ values: 'null' }).isString(),
    body('role').isIn(['Manager', 'Supervisor', 'Frontline', 'Support', 'Admin']).withMessage('Invalid role'),
    body('supervisorId').optional({ values: 'null' }).isString(),
    body('managerId').optional({ values: 'null' }).isString(),
    body('password').optional().isString().isLength({ min: 8 })
  ],
  validate,
  userManagementController.createUser
);

// Update user
router.put(
  '/:id',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    param('id').isString().notEmpty(),
    body('name').optional().isString().notEmpty(),
    body('email').optional().isEmail(),
    body('ou').optional({ values: 'null' }).isString(),
    body('role').optional().isIn(['Manager', 'Supervisor', 'Frontline', 'Support', 'Admin']),
    body('supervisorId').optional({ values: 'null' }).isString(),
    body('managerId').optional({ values: 'null' }).isString(),
    body('status').optional().isIn(['Active', 'Inactive', 'Locked', 'Deactivated', 'First-time'])
  ],
  validate,
  userManagementController.updateUser
);

// Change user password
router.put(
  '/:id/password',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    param('id').isString().notEmpty(),
    body('newPassword').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('requirePasswordChange').optional().isBoolean()
  ],
  validate,
  userManagementController.changeUserPassword
);

// Lock/Unlock user
router.put(
  '/:id/lock',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    param('id').isString().notEmpty(),
    body('locked').isBoolean().withMessage('Locked status must be boolean')
  ],
  validate,
  userManagementController.toggleUserLock
);

// Activate/Deactivate user
router.put(
  '/:id/activate',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    param('id').isString().notEmpty(),
    body('active').isBoolean().withMessage('Active status must be boolean')
  ],
  validate,
  userManagementController.toggleUserActivation
);

// Bulk operations
router.post(
  '/bulk/lock',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('userIds.*').isString().notEmpty(),
    body('locked').isBoolean().withMessage('Locked status must be boolean')
  ],
  validate,
  userManagementController.bulkLockUsers
);

router.post(
  '/bulk/activate',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
    body('userIds.*').isString().notEmpty(),
    body('active').isBoolean().withMessage('Active status must be boolean')
  ],
  validate,
  userManagementController.bulkActivateUsers
);

// Bulk upload users
router.post(
  '/bulk/upload',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    body('users').isArray({ min: 1 }).withMessage('Users array is required'),
    body('users.*.employeeId').isString().notEmpty().withMessage('Employee ID is required'),
    body('users.*.name').isString().notEmpty().withMessage('Name is required'),
    body('users.*.email').isEmail().withMessage('Valid email is required'),
    body('users.*.ou').optional().isString(),
    body('users.*.role').isIn(['Manager', 'Supervisor', 'Frontline', 'Support', 'Admin']).withMessage('Invalid role'),
    body('users.*.supervisorId').optional().isString(),
    body('users.*.managerId').optional().isString()
  ],
  validate,
  userManagementController.bulkCreateUsers
);

// Get organizational units
router.get(
  '/reference/ous',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  userManagementController.getOrganizationalUnits
);

// Get available supervisors and managers
router.get(
  '/reference/hierarchy',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [
    query('ou').optional().isString(),
    query('role').optional().isString()
  ],
  validate,
  userManagementController.getHierarchyOptions
);

// Get user's team (for managers and supervisors)
router.get(
  '/:id/team',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [param('id').isString().notEmpty()],
  validate,
  userManagementController.getUserTeam
);

// Send password reset email
router.post(
  '/:id/send-reset',
  // requireRole(['admin', 'manager']), // TEMPORARILY DISABLED FOR TESTING
  [param('id').isString().notEmpty()],
  validate,
  userManagementController.sendPasswordReset
);

module.exports = router;
