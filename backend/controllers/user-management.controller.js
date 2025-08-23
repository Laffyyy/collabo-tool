const bcrypt = require('bcrypt');
const UserModel = require('../model/user.model');
const ouModel = require('../model/ou.model');
const { getPool } = require('../config/db');
const { HttpError, BadRequestError, NotFoundError } = require('../utils/errors');

// Initialize UserModel with database pool
const userModel = new UserModel(getPool());

/**
 * Get all users with filtering and pagination
 */
const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      ou,
      role,
      status,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const filters = {
      search: search?.trim(),
      ou: ou?.trim(),
      role: role?.trim(),
      status: status?.trim()
    };

    // Remove empty filters
    Object.keys(filters).forEach(key => {
      if (!filters[key] || filters[key] === 'all') {
        delete filters[key];
      }
    });

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const result = await userModel.getAllUsers(filters, pagination);

    res.status(200).json({
      ok: true,
      data: {
        users: result.users,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalUsers: result.totalUsers,
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      ok: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user
 */
const createUser = async (req, res, next) => {
  try {
    const {
      employeeId,
      name,
      email,
      ou,
      role,
      supervisorId,
      managerId,
      password
    } = req.body;

    // Check if employee ID or email already exists
    const existingUser = await userModel.getUserByEmployeeIdOrEmail(employeeId, email);
    if (existingUser) {
      throw new BadRequestError('Employee ID or email already exists');
    }

    // Validate hierarchy relationships
    if (supervisorId) {
      const supervisor = await userModel.getUserById(supervisorId);
      if (!supervisor || supervisor.role !== 'Supervisor') {
        throw new BadRequestError('Invalid supervisor ID');
      }
    }

    if (managerId) {
      const manager = await userModel.getUserById(managerId);
      if (!manager || manager.role !== 'Manager') {
        throw new BadRequestError('Invalid manager ID');
      }
    }

    // Validate OU exists (if provided)
    if (ou && role !== 'Admin') {
      const validOU = await ouModel.getOUByName(ou);
      if (!validOU) {
        throw new BadRequestError('Invalid organizational unit');
      }
    }

    // Generate default password if not provided
    const defaultPassword = password || `${employeeId}@2024`;
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const userData = {
      employeeId,
      name,
      email,
      ou: role === 'Admin' ? null : ou,
      role,
      supervisorId: supervisorId || null,
      managerId: managerId || null,
      passwordHash: hashedPassword,
      status: 'First-time',
      type: role === 'Admin' ? 'admin' : 'user',
      mustChangePassword: true
    };

    const newUser = await userModel.createUser(userData);

    res.status(201).json({
      ok: true,
      message: 'User created successfully',
      data: { user: newUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const existingUser = await userModel.getUserById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Prevent changing admin users to non-admin and vice versa
    if (updates.role) {
      const isCurrentlyAdmin = existingUser.type === 'admin';
      const willBeAdmin = updates.role === 'Admin';

      if (isCurrentlyAdmin && !willBeAdmin) {
        throw new BadRequestError('Admin users cannot be changed to other roles');
      }

      if (!isCurrentlyAdmin && willBeAdmin) {
        throw new BadRequestError('Non-admin users cannot be changed to admin role');
      }
    }

    // Validate email uniqueness if being updated
    if (updates.email && updates.email !== existingUser.email) {
      const emailExists = await userModel.getUserByEmail(updates.email);
      if (emailExists) {
        throw new BadRequestError('Email already exists');
      }
    }

    // Validate hierarchy relationships
    if (updates.supervisorId) {
      const supervisor = await userModel.getUserById(updates.supervisorId);
      if (!supervisor || supervisor.role !== 'Supervisor') {
        throw new BadRequestError('Invalid supervisor ID');
      }
    }

    if (updates.managerId) {
      const manager = await userModel.getUserById(updates.managerId);
      if (!manager || manager.role !== 'Manager') {
        throw new BadRequestError('Invalid manager ID');
      }
    }

    // Validate OU exists (if provided and not admin)
    if (updates.ou && updates.role !== 'Admin' && existingUser.type !== 'admin') {
      const validOU = await ouModel.getOUByName(updates.ou);
      if (!validOU) {
        throw new BadRequestError('Invalid organizational unit');
      }
    }

    // Auto-assign manager for Frontline/Support based on supervisor
    if ((updates.role === 'Frontline' || updates.role === 'Support') && updates.supervisorId) {
      const supervisor = await userModel.getUserById(updates.supervisorId);
      if (supervisor && supervisor.managerId) {
        updates.managerId = supervisor.managerId;
      }
    }

    const updatedUser = await userModel.updateUser(id, updates);

    res.status(200).json({
      ok: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 */
const changeUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, requirePasswordChange = false } = req.body;

    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await userModel.updatePassword(id, hashedPassword, requirePasswordChange);

    res.status(200).json({
      ok: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user lock status
 */
const toggleUserLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { locked } = req.body;

    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newStatus = locked ? 'Locked' : 'Active';
    await userModel.updateUserStatus(id, newStatus);

    res.status(200).json({
      ok: true,
      message: `User ${locked ? 'locked' : 'unlocked'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user activation status
 */
const toggleUserActivation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newStatus = active ? 'Active' : 'Deactivated';
    await userModel.updateUserStatus(id, newStatus);

    res.status(200).json({
      ok: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk lock/unlock users
 */
const bulkLockUsers = async (req, res, next) => {
  try {
    const { userIds, locked } = req.body;

    const newStatus = locked ? 'Locked' : 'Active';
    const result = await userModel.bulkUpdateStatus(userIds, newStatus);

    res.status(200).json({
      ok: true,
      message: `${result.affectedRows} users ${locked ? 'locked' : 'unlocked'} successfully`,
      data: { affectedUsers: result.affectedRows }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk activate/deactivate users
 */
const bulkActivateUsers = async (req, res, next) => {
  try {
    const { userIds, active } = req.body;

    const newStatus = active ? 'Active' : 'Deactivated';
    const result = await userModel.bulkUpdateStatus(userIds, newStatus);

    res.status(200).json({
      ok: true,
      message: `${result.affectedRows} users ${active ? 'activated' : 'deactivated'} successfully`,
      data: { affectedUsers: result.affectedRows }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create users
 */
const bulkCreateUsers = async (req, res, next) => {
  try {
    const { users } = req.body;
    
    const results = {
      successful: [],
      failed: []
    };

    for (const userData of users) {
      try {
        // Check if employee ID or email already exists
        const existingUser = await userModel.getUserByEmployeeIdOrEmail(
          userData.employeeId,
          userData.email
        );

        if (existingUser) {
          results.failed.push({
            ...userData,
            error: 'Employee ID or email already exists'
          });
          continue;
        }

        // Validate OU exists (if provided and not admin)
        if (userData.ou && userData.role !== 'Admin') {
          const validOU = await ouModel.getOUByName(userData.ou);
          if (!validOU) {
            results.failed.push({
              ...userData,
              error: 'Invalid organizational unit'
            });
            continue;
          }
        }

        // Generate default password
        const defaultPassword = `${userData.employeeId}@2024`;
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        const userToCreate = {
          employeeId: userData.employeeId,
          name: userData.name,
          email: userData.email,
          ou: userData.role === 'Admin' ? null : userData.ou,
          role: userData.role,
          supervisorId: userData.supervisorId || null,
          managerId: userData.managerId || null,
          passwordHash: hashedPassword,
          status: 'First-time',
          type: userData.role === 'Admin' ? 'admin' : 'user',
          mustChangePassword: true
        };

        const newUser = await userModel.createUser(userToCreate);
        results.successful.push(newUser);

      } catch (error) {
        results.failed.push({
          ...userData,
          error: error.message
        });
      }
    }

    res.status(200).json({
      ok: true,
      message: `Bulk upload completed. ${results.successful.length} users created, ${results.failed.length} failed.`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizational units
 */
const getOrganizationalUnits = async (req, res, next) => {
  try {
    const ous = await ouModel.getAllOUs();

    res.status(200).json({
      ok: true,
      data: { ous }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get hierarchy options (supervisors and managers)
 */
const getHierarchyOptions = async (req, res, next) => {
  try {
    const { ou, role } = req.query;

    const filters = {};
    if (ou) filters.ou = ou;
    if (role) filters.role = role;

    const supervisors = await userModel.getUsersByRole('Supervisor', filters);
    const managers = await userModel.getUsersByRole('Manager', filters);

    res.status(200).json({
      ok: true,
      data: {
        supervisors,
        managers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's team
 */
const getUserTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let teamMembers = [];

    if (user.role === 'Manager') {
      // Get all supervisors and their team members under this manager
      teamMembers = await userModel.getManagerTeam(id);
    } else if (user.role === 'Supervisor') {
      // Get all frontline and support under this supervisor
      teamMembers = await userModel.getSupervisorTeam(id);
    }

    res.status(200).json({
      ok: true,
      data: {
        user,
        teamMembers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send password reset email
 */
const sendPasswordReset = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await userModel.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Here you would integrate with your email service
    // For now, we'll just simulate sending an email
    
    // Generate a password reset token (in a real app, you'd store this)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    
    // In a real application, you would:
    // 1. Store the reset token in the database with expiration
    // 2. Send an email with the reset link
    // 3. Provide an endpoint to handle the reset link
    
    res.status(200).json({
      ok: true,
      message: `Password reset email sent to ${user.email}`,
      data: {
        resetToken // In production, don't return this
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  toggleUserLock,
  toggleUserActivation,
  bulkLockUsers,
  bulkActivateUsers,
  bulkCreateUsers,
  getOrganizationalUnits,
  getHierarchyOptions,
  getUserTeam,
  sendPasswordReset
};
