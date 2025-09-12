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
 * Test user status endpoints without authentication - Mock data version
 */
router.get('/test-users', devOnly, async (req, res) => {
  try {
    console.log('🧪 Test endpoint called - returning mock users');
    
    // Mock users for development without database
    const mockUsers = [
      {
        id: '1',
        username: 'alice.johnson',
        email: 'alice.johnson@company.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'manager',
        organizationalUnit: 'Engineering',
        status: 'online',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        department: 'Engineering',
        isOnline: true
      },
      {
        id: '2',
        username: 'bob.smith',
        email: 'bob.smith@company.com',
        firstName: 'Bob',
        lastName: 'Smith',
        role: 'developer',
        organizationalUnit: 'Engineering',
        status: 'away',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        department: 'Engineering',
        isOnline: false
      },
      {
        id: '3',
        username: 'carol.davis',
        email: 'carol.davis@company.com',
        firstName: 'Carol',
        lastName: 'Davis',
        role: 'designer',
        organizationalUnit: 'Design',
        status: 'online',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        department: 'Design',
        isOnline: true
      },
      {
        id: '4',
        username: 'david.wilson',
        email: 'david.wilson@company.com',
        firstName: 'David',
        lastName: 'Wilson',
        role: 'admin',
        organizationalUnit: 'IT',
        status: 'idle',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        department: 'IT',
        isOnline: true
      }
    ];
    
    res.json({
      success: true,
      count: mockUsers.length,
      users: mockUsers
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

/**
 * Development reaction endpoints that bypass authentication
 */
router.post('/messages/:messageId/reactions', devOnly, async (req, res) => {
  try {
    console.log('🧪 DEV: Adding reaction without auth', { messageId: req.params.messageId, body: req.body });
    
    // Mock authentication
    req.user = { id: 'dev-user-123', username: 'devuser', role: 'admin' };
    
    const chatController = require('../../controllers/chat.controller');
    await chatController.addReaction(req, res);
  } catch (error) {
    console.error('❌ Dev reaction add error:', error);
    res.status(500).json({
      success: false,
      message: 'Dev reaction add failed',
      error: error.message
    });
  }
});

router.delete('/messages/:messageId/reactions/:emoji', devOnly, async (req, res) => {
  try {
    console.log('🧪 DEV: Removing reaction without auth', { messageId: req.params.messageId, emoji: req.params.emoji });
    
    // Mock authentication
    req.user = { id: 'dev-user-123', username: 'devuser', role: 'admin' };
    
    const chatController = require('../../controllers/chat.controller');
    await chatController.removeReaction(req, res);
  } catch (error) {
    console.error('❌ Dev reaction remove error:', error);
    res.status(500).json({
      success: false,
      message: 'Dev reaction remove failed',
      error: error.message
    });
  }
});

router.get('/messages/:messageId/reactions', devOnly, async (req, res) => {
  try {
    console.log('🧪 DEV: Getting reactions without auth', { messageId: req.params.messageId });
    
    // Mock authentication
    req.user = { id: 'dev-user-123', username: 'devuser', role: 'admin' };
    
    const chatController = require('../../controllers/chat.controller');
    await chatController.getMessageReactions(req, res);
  } catch (error) {
    console.error('❌ Dev reaction get error:', error);
    res.status(500).json({
      success: false,
      message: 'Dev reaction get failed',
      error: error.message
    });
  }
});

/**
 * Mock chat conversations endpoint
 */
router.get('/conversations', devOnly, async (req, res) => {
  try {
    console.log('🧪 DEV: Getting mock conversations');
    
    const mockConversations = [
      {
        id: 'conv-1',
        name: 'Alice Johnson',
        type: 'direct',
        lastMessage: 'Hey! How are you doing?',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        unreadCount: 2,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
        isOnline: true,
        isRead: false,
        department: 'Engineering',
        role: 'Manager',
        members: [
          { id: '1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150' }
        ],
        messages: []
      },
      {
        id: 'conv-2', 
        name: 'Engineering Team',
        type: 'group',
        lastMessage: 'Meeting at 3 PM today',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        unreadCount: 0,
        avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
        isOnline: false,
        isRead: true,
        members: [
          { id: '1', name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150' },
          { id: '2', name: 'Bob Smith', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }
        ],
        messages: []
      },
      {
        id: 'conv-3',
        name: 'Carol Davis',
        type: 'direct',
        lastMessage: 'Can you review the designs?',
        lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        unreadCount: 1,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        isOnline: true,
        isRead: false,
        department: 'Design',
        role: 'Designer',
        members: [
          { id: '3', name: 'Carol Davis', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' }
        ],
        messages: []
      }
    ];
    
    res.json({
      success: true,
      conversations: mockConversations
    });
  } catch (error) {
    console.error('❌ Dev conversations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Mock chat messages endpoint
 */
router.get('/messages/:conversationId', devOnly, async (req, res) => {
  try {
    const { conversationId } = req.params;
    console.log('🧪 DEV: Getting mock messages for conversation:', conversationId);
    
    const mockMessages = [
      {
        id: 'msg-1',
        senderId: '1',
        senderName: 'Alice Johnson',
        senderDepartment: 'Engineering',
        senderRole: 'Manager',
        content: 'Hey! How are you doing?',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        type: 'text',
        reactions: [
          { emoji: '👍', users: ['2'], count: 1 },
          { emoji: '😊', users: ['3'], count: 1 }
        ]
      },
      {
        id: 'msg-2',
        senderId: '2',
        senderName: 'Bob Smith',
        senderDepartment: 'Engineering',
        senderRole: 'Developer',
        content: 'I\'m doing great! Working on the new feature.',
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        type: 'text',
        reactions: []
      },
      {
        id: 'msg-3',
        senderId: '1',
        senderName: 'Alice Johnson',
        senderDepartment: 'Engineering', 
        senderRole: 'Manager',
        content: 'That sounds awesome! Let me know if you need any help.',
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        type: 'text',
        reactions: [
          { emoji: '🚀', users: ['2'], count: 1 }
        ]
      }
    ];
    
    res.json({
      success: true,
      messages: mockMessages
    });
  } catch (error) {
    console.error('❌ Dev messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
