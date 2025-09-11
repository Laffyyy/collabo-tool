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

// Test database connection and table structure
router.get('/test-db', devOnly, async (req, res) => {
  try {
    const pool = getPool();
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if tblusers table exists
    const tableCheck = await client.query(`
      SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tblusers'
      ORDER BY ordinal_position;
    `);
    
    // Check for user status columns specifically
    const statusColumns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tblusers' 
      AND column_name IN ('dlastactivity', 'donlinestatus');
    `);
    
    // Get sample user data
    const sampleUsers = await client.query('SELECT vusername, vrole, vorganizationalunit FROM tblusers LIMIT 3');
    
    client.release();
    
    res.json({
      ok: true,
      message: 'Database test completed',
      tableExists: tableCheck.rows.length > 0,
      tableColumns: tableCheck.rows,
      statusColumnsExist: statusColumns.rows.length === 2,
      statusColumns: statusColumns.rows,
      sampleUsers: sampleUsers.rows
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      ok: false,
      message: 'Database test failed',
      error: error.message
    });
  }
});

// Test user routes
router.get('/test-users', devOnly, async (req, res) => {
  try {
    const UserController = require('../../controllers/user.controller');
    
    // Create a mock request/response to test the controller
    const mockReq = {};
    const mockRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ status: code, data }) })
    };
    const mockNext = (error) => ({ error });
    
    const result = await UserController.getAllUsers(mockReq, mockRes, mockNext);
    
    res.json({
      ok: true,
      message: 'User controller test completed',
      result: result
    });
  } catch (error) {
    console.error('❌ User controller test failed:', error);
    res.status(500).json({
      ok: false,
      message: 'User controller test failed',
      error: error.message
    });
  }
});

/**
 * Test user status endpoints without authentication
 */
router.get('/test-users', devOnly, async (req, res) => {
  try {
    console.log('🧪 Test endpoint called - no auth required');
    const UserStatusModel = require('../../model/user-status.model');
    const users = await UserStatusModel.getAllUsersWithStatus();
    console.log(`🧪 Found ${users.length} users`);
    
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        username: user.username,
        email: user.email,
        role: user.role,
        organizationalUnit: user.organizationalUnit,
        status: user.status
      }))
    });
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

router.get('/test-user/:username', devOnly, async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`🧪 Test user endpoint called for: ${username}`);
    
    const UserStatusModel = require('../../model/user-status.model');
    const user = await UserStatusModel.getUserByUsername(username);
    console.log(`🧪 User result:`, user);
    
    res.json({
      success: true,
      username,
      found: !!user,
      user
    });
  } catch (error) {
    console.error('❌ Test user endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
