const express = require('express');
const bcrypt = require('bcrypt');
const { getPool } = require('../../config/db');
const UserModel = require('../../model/user.model');
const RoleModel = require('../../model/role.model');
const UserRoleModel = require('../../model/user-role.model');
const userManagementController = require('../../controllers/user-management.controller');
const ouModel = require('../../model/ou.model');

const router = express.Router();

/**
 * Development endpoints that bypass authentication
 * WARNING: Only available in development mode
 */

// Middleware to ensure dev mode only
const devOnly = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ ok: false, message: 'Not found' });
  }
  next();
};

/**
 * Get users without authentication (dev only)
 */
router.get('/users', devOnly, async (req, res, next) => {
  try {
    // Mock the auth middleware requirements
    req.user = { id: 'dev-user', role: 'admin' };
    
    // Call the actual controller
    await userManagementController.getUsers(req, res, next);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
});

/**
 * Get organizational units without authentication (dev only)
 */
router.get('/ous', devOnly, async (req, res, next) => {
  try {
    const ous = await ouModel.getAllOUs();
    res.status(200).json({
      ok: true,
      data: { ous }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to get organizational units',
      error: error.message
    });
  }
});

/**
 * Get user by ID without authentication (dev only)
 */
router.get('/users/:id', devOnly, async (req, res, next) => {
  try {
    req.user = { id: 'dev-user', role: 'admin' };
    await userManagementController.getUserById(req, res, next);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
});

/**
 * Create user without authentication (dev only)
 */
router.post('/users', devOnly, async (req, res, next) => {
  try {
    req.user = { id: 'dev-user', role: 'admin' };
    await userManagementController.createUser(req, res, next);
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/**
 * Development-only admin user creation endpoint
 */
router.post('/create-admin', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ ok: false, message: 'Not found' });
    }

    const pool = getPool();
    const userModel = new UserModel(pool);
    const roleModel = new RoleModel(pool);
    const userRoleModel = new UserRoleModel(pool);

    console.log('🔄 Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await userModel.findByEmail('admin@company.com');
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return res.status(200).json({
        ok: true,
        message: 'Admin user already exists',
        credentials: {
          email: 'admin@company.com',
          password: 'admin123'
        }
      });
    }

    // Create admin user
    const adminUser = await userModel.create({
      employeeId: 'EMP001',
      username: 'admin',
      email: 'admin@company.com',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      accountStatus: 'active',
      mustChangePassword: false
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Ensure admin role exists
    let adminRole;
    try {
      adminRole = await roleModel.findByName('admin');
    } catch (error) {
      // Role might not exist, create it
      adminRole = await roleModel.create({
        name: 'admin',
        hierarchyLevel: 1,
        permissions: {
          'user_management': true,
          'system_administration': true,
          'broadcast_management': true,
          'chat_management': true,
          'global_configuration': true,
          'audit_logs': true
        }
      });
      console.log('✅ Admin role created');
    }

    if (adminRole) {
      // Assign admin role to admin user
      await userRoleModel.assignRole({
        userId: adminUser.id,
        roleId: adminRole.id
      });
      console.log('✅ Admin role assigned to admin user');
    }

    res.status(200).json({
      ok: true,
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@company.com',
        password: 'admin123'
      },
      user: adminUser
    });

  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});

module.exports = router;
