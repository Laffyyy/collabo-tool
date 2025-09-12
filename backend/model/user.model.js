const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class UserModel {
  constructor(pool) {
    this.pool = pool;
  }

  // Account Status Constants
  static ACCOUNT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    LOCKED: 'locked',
    DEACTIVATED: 'deactivated',
    FIRST_TIME: 'first-time'
  };

  // Presence Status Constants
  static PRESENCE_STATUS = {
    ONLINE: 'online',
    AWAY: 'away',
    IDLE: 'idle',
    OFFLINE: 'offline'
  };

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @returns {Promise<Object>} Created user object
   */
  async create(userData) {
    const {
      employeeId,
      username,
      email,
      password,
      firstName,
      lastName,
      profilePhotoUrl = null,
      coverPhotoUrl = null,
      phone = null,
      accountStatus = UserModel.ACCOUNT_STATUS.FIRST_TIME,
      presenceStatus = UserModel.PRESENCE_STATUS.OFFLINE,
      mustChangePassword = true
    } = userData;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    const query = `
      INSERT INTO tblusers (
        demployeeid, dusername, demail, dpasswordhash, dfirstname, dlastname,
        dprofilephotourl, dcoverphotourl, dphone, daccountstatus, 
        dpresencestatus, dmustchangepassword
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      employeeId, username, email, passwordHash, firstName, lastName,
      profilePhotoUrl, coverPhotoUrl, phone, accountStatus, 
      presenceStatus, mustChangePassword
    ];

    const result = await this.pool.query(query, values);
    return this.formatUser(result.rows[0]);
  }

  /**
   * Find user by ID
   * @param {string} id - User ID (UUID)
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    const query = 'SELECT * FROM tblusers WHERE did = $1';
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsername(username) {
    const query = 'SELECT * FROM tblusers WHERE dusername = $1';
    const result = await this.pool.query(query, [username]);
    
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM tblusers WHERE demail = $1';
    const result = await this.pool.query(query, [email]);
    
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by employee ID
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmployeeId(employeeId) {
    const query = 'SELECT * FROM tblusers WHERE demployeeid = $1';
    const result = await this.pool.query(query, [employeeId]);
    
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Update user data
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} Updated user object
   */
  async update(id, updateData) {
    const allowedFields = [
      'dusername', 'demail', 'dfirstname', 'dlastname', 'dprofilephotourl',
      'dcoverphotourl', 'dphone', 'daccountstatus', 'dpresencestatus',
      'dmustchangepassword'
    ];

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated timestamp
    updateFields.push(`tupdatedat = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    // Add ID for WHERE clause
    values.push(id);

    const query = `
      UPDATE tblusers 
      SET ${updateFields.join(', ')}
      WHERE did = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

/**
 * Update user password for management
 * @param {string} id - User ID
 * @param {string} hashedPassword - Hashed password (already hashed)
 * @param {boolean} requirePasswordChange - Require password change on next login
 * @returns {Promise<boolean>} Success status
 */
async updatePassword(id, hashedPassword, requirePasswordChange = false) {
  const query = `
    UPDATE tblusers 
    SET dpasswordhash = $1, dmustchangepassword = $2, tupdatedat = NOW()
    WHERE did = $3
  `;

  const result = await this.pool.query(query, [hashedPassword, requirePasswordChange, id]);
  return result.rowCount > 0;
}

  /**
   * Update user presence status
   * @param {string} id - User ID
   * @param {string} status - Presence status
   * @returns {Promise<boolean>} Success status
   */
  async updatePresenceStatus(id, status) {
    if (!Object.values(UserModel.PRESENCE_STATUS).includes(status)) {
      throw new Error('Invalid presence status');
    }

    const query = `
      UPDATE tblusers 
      SET dpresencestatus = $1, tlastseen = $2, tupdatedat = $3
      WHERE did = $4
    `;

    const result = await this.pool.query(query, [status, new Date(), new Date(), id]);
    return result.rowCount > 0;
  }

  /**
   * Update last login timestamp
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async updateLastLogin(id) {
    const query = `
      UPDATE tblusers 
      SET tlastlogin = $1, tupdatedat = $2
      WHERE did = $3
    `;

    const result = await this.pool.query(query, [new Date(), new Date(), id]);
    return result.rowCount > 0;
  }

  /**
   * Verify user password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} Password match status
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get all users with pagination
   * @param {number} limit - Number of users per page
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Users array and total count
   */
  async findAll(limit = 50, offset = 0) {
    const countQuery = 'SELECT COUNT(*) FROM tblusers';
    const dataQuery = `
      SELECT * FROM tblusers 
      ORDER BY tcreatedat DESC 
      LIMIT $1 OFFSET $2
    `;

    const [countResult, dataResult] = await Promise.all([
      this.pool.query(countQuery),
      this.pool.query(dataQuery, [limit, offset])
    ]);

    return {
      users: dataResult.rows.map(user => this.formatUser(user)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Search users by name or username
   * @param {string} searchTerm - Search term
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Array of matching users
   */
  async search(searchTerm, limit = 20) {
    const query = `
      SELECT * FROM tblusers 
      WHERE dusername ILIKE $1 
         OR dfirstname ILIKE $1 
         OR dlastname ILIKE $1 
         OR CONCAT(dfirstname, ' ', dlastname) ILIKE $1
      ORDER BY dfirstname, dlastname
      LIMIT $2
    `;

    const result = await this.pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows.map(user => this.formatUser(user));
  }

  /**
   * Delete user (soft delete by setting status to deactivated)
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const query = `
      UPDATE tblusers 
      SET daccountstatus = $1, tupdatedat = $2
      WHERE did = $3
    `;

    const result = await this.pool.query(query, [UserModel.ACCOUNT_STATUS.DEACTIVATED, new Date(), id]);
    return result.rowCount > 0;
  }

  /**
   * Format user object (remove sensitive data, format field names)
   * @param {Object} user - Raw user object from database
   * @param {boolean} includeSensitive - Include sensitive data
   * @returns {Object} Formatted user object
   */
  formatUser(user, includeSensitive = false) {
    if (!user) return null;

    const formatted = {
      id: user.did,
      employeeId: user.demployeeid,
      username: user.dusername,
      email: user.demail,
      firstName: user.dfirstname,
      lastName: user.dlastname,
      profilePhotoUrl: user.dprofilephotourl,
      coverPhotoUrl: user.dcoverphotourl,
      phone: user.dphone,
      accountStatus: user.daccountstatus,
      presenceStatus: user.dpresencestatus,
      lastLogin: user.tlastlogin,
      lastSeen: user.tlastseen,
      joinDate: user.tjoindate,
      mustChangePassword: user.dmustchangepassword,
      createdAt: user.tcreatedat,
      updatedAt: user.tupdatedat
    };

    // Include password hash only if specifically requested (for auth purposes)
    if (includeSensitive) {
      formatted.passwordHash = user.dpasswordhash;
    }

    return formatted;
  }

  /**
   * Get all users with filtering and pagination for user management
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Users with pagination info
   */
  async getAllUsers(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'dfirstname',
      sortOrder = 'asc'
    } = pagination;

    const offset = (page - 1) * limit;
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Build WHERE conditions based on actual table structure
    if (filters.search) {
      whereConditions.push(`(
        u.dusername ILIKE $${paramIndex} OR 
        u.dfirstname ILIKE $${paramIndex} OR 
        u.dlastname ILIKE $${paramIndex} OR 
        u.demail ILIKE $${paramIndex} OR
        u.demployeeid ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.ou) {
      console.log('OU Filter applied:', filters.ou); // Debug log
      whereConditions.push(`LOWER(ou.dname) = LOWER($${paramIndex})`);
      queryParams.push(filters.ou);
      paramIndex++;
    }

    if (filters.role) {
      whereConditions.push(`r.dname = $${paramIndex}`);
      queryParams.push(filters.role);
      paramIndex++;
    }

    if (filters.status) {
      whereConditions.push(`u.daccountstatus = $${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validate sort column - update to use actual columns
    const validSortColumns = ['u.demployeeid', 'u.dfirstname', 'u.dlastname', 'u.demail', 'u.daccountstatus'];
    const sortColumn = validSortColumns.includes(`u.${sortBy}`) ? `u.${sortBy}` : 'u.dfirstname';
    const sortDirection = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Count query with proper joins
    const countQuery = `
      SELECT COUNT(DISTINCT u.did) as total 
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      ${whereClause}
    `;
    
    // Data query with proper joins to get role and hierarchy data
    const dataQuery = `
      SELECT DISTINCT u.*, 
             r.dname as role_name,
             ur.douid as ou_id,
             ur.dsupervisorid as supervisor_id,
             ur.dmanagerid as manager_id,
             s.dfirstname as supervisor_firstname, 
             s.dlastname as supervisor_lastname,
             m.dfirstname as manager_firstname, 
             m.dlastname as manager_lastname,
             ou.dname as ou_name
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      LEFT JOIN tblusers s ON ur.dsupervisorid = s.did
      LEFT JOIN tblusers m ON ur.dmanagerid = m.did
      LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Debug logging
    console.log('Final Query:', dataQuery);
    console.log('Query Params:', queryParams);
    console.log('Where Clause:', whereClause);

    const [countResult, dataResult] = await Promise.all([
      this.pool.query(countQuery, queryParams.slice(0, -2)),
      this.pool.query(dataQuery, queryParams)
    ]);

    const totalUsers = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalUsers / limit);

    return {
      users: dataResult.rows.map(user => this.formatUserForManagement(user)),
      currentPage: page,
      totalPages,
      totalUsers,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Get user by employee ID or email
   * @param {string} employeeId - Employee ID
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmployeeIdOrEmail(employeeId, email) {
    const query = 'SELECT * FROM tblusers WHERE demployeeid = $1 OR demail = $2';
    const result = await this.pool.query(query, [employeeId, email]);
    
    return result.rows.length > 0 ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Create user for user management
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        employeeId,
        name,
        email,
        ou,
        role,
        supervisorId,
        managerId,
        passwordHash = null,
        status = 'first-time',
        mustChangePassword = true
      } = userData;

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Insert user into tblusers
      const userQuery = `
        INSERT INTO tblusers (
          demployeeid, dusername, demail, dpasswordhash, dfirstname, dlastname,
          daccountstatus, dmustchangepassword, dpresencestatus, 
          tjoindate, tcreatedat, tupdatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'offline', NOW(), NOW(), NOW())
        RETURNING *
      `;

      const userValues = [
        employeeId,
        email, // Use email as username
        email,
        passwordHash,
        firstName,
        lastName,
        status,
        mustChangePassword
      ];

      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];
      const userId = newUser.did;

      // Get role ID and OU ID for tbluserroles
      let roleId = null;
      if (role && role !== 'No Role') {
        const roleQuery = 'SELECT did FROM tblroles WHERE dname = $1';
        const roleResult = await client.query(roleQuery, [role]);
        if (roleResult.rows.length > 0) {
          roleId = roleResult.rows[0].did;
        }
      }

      let ouId = null;
      if (ou && ou !== 'Unassigned') {
        const ouQuery = 'SELECT did FROM tblorganizationalunits WHERE dname = $1';
        const ouResult = await client.query(ouQuery, [ou]);
        if (ouResult.rows.length > 0) {
          ouId = ouResult.rows[0].did;
        }
      }

      // Insert into tbluserroles if we have role information
      if (roleId || ouId || supervisorId || managerId) {
        const userRoleQuery = `
          INSERT INTO tbluserroles (
            duserid, droleid, douid, dsupervisorid, dmanagerid
          ) VALUES ($1, $2, $3, $4, $5)
        `;

        await client.query(userRoleQuery, [
          userId,
          roleId,
          ouId,
          supervisorId,
          managerId
        ]);
      }

      await client.query('COMMIT');

      // Return formatted user
      return this.formatUserForManagement({
        ...newUser,
        role_name: role || 'No Role',
        ou_name: ou || 'Unassigned',
        supervisor_id: supervisorId,
        manager_id: managerId,
        supervisor_firstname: null,
        supervisor_lastname: null,
        manager_firstname: null,
        manager_lastname: null
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user for user management
   * @param {string} id - User ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, updates) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update basic user info in tblusers table
      const userUpdateFields = [];
      const userValues = [];
      let userParamIndex = 1;

      if (updates.name) {
        const nameParts = updates.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        userUpdateFields.push(`dfirstname = $${userParamIndex++}`, `dlastname = $${userParamIndex++}`);
        userValues.push(firstName, lastName);
      }

      if (updates.email) {
        userUpdateFields.push(`demail = $${userParamIndex++}`, `dusername = $${userParamIndex++}`);
        userValues.push(updates.email, updates.email);
      }

      if (updates.status) {
        userUpdateFields.push(`daccountstatus = $${userParamIndex++}`);
        userValues.push(updates.status);
      }

      // Update basic user info if there are fields to update
      if (userUpdateFields.length > 0) {
        userUpdateFields.push(`tupdatedat = NOW()`);
        userValues.push(id);
        
        const userUpdateQuery = `
          UPDATE tblusers 
          SET ${userUpdateFields.join(', ')}
          WHERE did = $${userParamIndex}
        `;
        
        await client.query(userUpdateQuery, userValues);
      }

      // Handle role, OU, and hierarchy updates in tbluserroles table
      if (updates.role || updates.ou !== undefined || updates.supervisorId !== undefined || updates.managerId !== undefined) {
        // Get role ID if role is being updated
        let roleId = null;
        if (updates.role) {
          const roleResult = await client.query('SELECT did FROM tblroles WHERE dname = $1', [updates.role]);
          if (roleResult.rows.length === 0) {
            throw new Error('Invalid role specified');
          }
          roleId = roleResult.rows[0].did;
        }

        // Get OU ID if OU is being updated
        let ouId = null;
        if (updates.ou !== undefined) {
          if (updates.ou) {
            const ouResult = await client.query('SELECT did FROM tblorganizationalunits WHERE dname = $1', [updates.ou]);
            if (ouResult.rows.length === 0) {
              throw new Error('Invalid organizational unit specified');
            }
            ouId = ouResult.rows[0].did;
          }
        }

        // Check if user has existing role assignment
        const existingRoleResult = await client.query(
          'SELECT * FROM tbluserroles WHERE duserid = $1',
          [id]
        );

        if (existingRoleResult.rows.length > 0) {
          // Update existing role assignment
          const roleUpdateFields = [];
          const roleValues = [];
          let roleParamIndex = 1;

          if (roleId) {
            roleUpdateFields.push(`droleid = $${roleParamIndex++}`);
            roleValues.push(roleId);
          }

          if (updates.ou !== undefined) {
            roleUpdateFields.push(`douid = $${roleParamIndex++}`);
            roleValues.push(ouId);
          }

          if (updates.supervisorId !== undefined) {
            roleUpdateFields.push(`dsupervisorid = $${roleParamIndex++}`);
            roleValues.push(updates.supervisorId);
          }

          if (updates.managerId !== undefined) {
            roleUpdateFields.push(`dmanagerid = $${roleParamIndex++}`);
            roleValues.push(updates.managerId);
          }

          if (roleUpdateFields.length > 0) {
            roleValues.push(id);
            const roleUpdateQuery = `
              UPDATE tbluserroles 
              SET ${roleUpdateFields.join(', ')}
              WHERE duserid = $${roleParamIndex}
            `;
            await client.query(roleUpdateQuery, roleValues);
          }
        } else if (roleId) {
          // Create new role assignment
          await client.query(
            `INSERT INTO tbluserroles (duserid, droleid, douid, dsupervisorid, dmanagerid) 
             VALUES ($1, $2, $3, $4, $5)`,
            [id, roleId, ouId, updates.supervisorId || null, updates.managerId || null]
          );
        }
      }

      await client.query('COMMIT');
      
      // Return updated user
      return await this.getUserById(id);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user password for management
   * @param {string} id - User ID
   * @param {string} hashedPassword - Hashed password
   * @param {boolean} requirePasswordChange - Require password change
   * @returns {Promise<boolean>} Success status
   */
  async updatePassword(id, hashedPassword, requirePasswordChange = false) {
    const query = `
      UPDATE tblusers 
      SET dpasswordhash = $1, dmustchangepassword = $2, tupdatedat = NOW()
      WHERE did = $3
    `;

    const result = await this.pool.query(query, [hashedPassword, requirePasswordChange, id]);
    return result.rowCount > 0;
  }

  /**
   * Update user status
   * @param {string} id - User ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} Success status
   */
  async updateUserStatus(id, status) {
    const query = `
      UPDATE tblusers 
      SET daccountstatus = $1, tupdatedat = NOW()
      WHERE did = $2
    `;

    const result = await this.pool.query(query, [status, id]);
    return result.rowCount > 0;
  }

  /**
   * Bulk update user status
   * @param {Array} userIds - Array of user IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Result with affected rows
   */
  async bulkUpdateStatus(userIds, status) {
    if (!userIds || userIds.length === 0) {
      return { affectedRows: 0 };
    }

    const placeholders = userIds.map((_, index) => `$${index + 2}`).join(',');
    const query = `
      UPDATE tblusers 
      SET daccountstatus = $1, tupdatedat = NOW()
      WHERE did IN (${placeholders})
    `;

    const result = await this.pool.query(query, [status, ...userIds]);
    return { affectedRows: result.rowCount };
  }

  /**
   * Get users by role
   * @param {string} role - Role name
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Array of users
   */
  async getUsersByRole(role, filters = {}) {
    const whereConditions = ['r.dname = $1', 'u.daccountstatus IN ($2, $3)'];
    const queryParams = [role, 'active', 'first-time'];
    let paramIndex = 4;

    if (filters.ou) {
      whereConditions.push(`ou.dname = $${paramIndex}`);
      queryParams.push(filters.ou);
      paramIndex++;
    }

    const query = `
      SELECT DISTINCT u.*, 
             r.dname as role_name,
             ur.douid as ou_id,
             ur.dsupervisorid as supervisor_id,
             ur.dmanagerid as manager_id,
             s.dfirstname as supervisor_firstname, 
             s.dlastname as supervisor_lastname,
             m.dfirstname as manager_firstname, 
             m.dlastname as manager_lastname,
             ou.dname as ou_name
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      LEFT JOIN tblusers s ON ur.dsupervisorid = s.did
      LEFT JOIN tblusers m ON ur.dmanagerid = m.did
      LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY u.dfirstname, u.dlastname
    `;

    const result = await this.pool.query(query, queryParams);
    return result.rows.map(user => this.formatUserForManagement(user));
  }

  /**
   * Get manager's team
   * @param {string} managerId - Manager ID
   * @returns {Promise<Array>} Array of team members
   */
  async getManagerTeam(managerId) {
    const query = `
      SELECT DISTINCT u.*, 
             r.dname as role_name,
             ur.douid as ou_id,
             ur.dsupervisorid as supervisor_id,
             ur.dmanagerid as manager_id,
             s.dfirstname as supervisor_firstname, 
             s.dlastname as supervisor_lastname,
             m.dfirstname as manager_firstname, 
             m.dlastname as manager_lastname,
             ou.dname as ou_name
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      LEFT JOIN tblusers s ON ur.dsupervisorid = s.did
      LEFT JOIN tblusers m ON ur.dmanagerid = m.did
      LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
      WHERE ur.dmanagerid = $1 AND u.daccountstatus != $2
      ORDER BY r.dname DESC, u.dfirstname, u.dlastname
    `;

    const result = await this.pool.query(query, [managerId, 'deleted']);
    return result.rows.map(user => this.formatUserForManagement(user));
  }

  /**
   * Get supervisor's team
   * @param {string} supervisorId - Supervisor ID
   * @returns {Promise<Array>} Array of team members
   */
  async getSupervisorTeam(supervisorId) {
    const query = `
      SELECT DISTINCT u.*, 
             r.dname as role_name,
             ur.douid as ou_id,
             ur.dsupervisorid as supervisor_id,
             ur.dmanagerid as manager_id,
             s.dfirstname as supervisor_firstname, 
             s.dlastname as supervisor_lastname,
             m.dfirstname as manager_firstname, 
             m.dlastname as manager_lastname,
             ou.dname as ou_name
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      LEFT JOIN tblusers s ON ur.dsupervisorid = s.did
      LEFT JOIN tblusers m ON ur.dmanagerid = m.did
      LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
      WHERE ur.dsupervisorid = $1 AND u.daccountstatus != $2
      ORDER BY r.dname, u.dfirstname, u.dlastname
    `;

    const result = await this.pool.query(query, [supervisorId, 'deleted']);
    return result.rows.map(user => this.formatUserForManagement(user));
  }

  /**
   * Get user by ID for management
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserById(id) {
    const query = `
      SELECT u.*, 
             r.dname as role_name,
             ur.douid as ou_id,
             ur.dsupervisorid as supervisor_id,
             ur.dmanagerid as manager_id,
             s.dfirstname as supervisor_firstname, 
             s.dlastname as supervisor_lastname,
             m.dfirstname as manager_firstname, 
             m.dlastname as manager_lastname,
             ou.dname as ou_name
      FROM tblusers u
      LEFT JOIN tbluserroles ur ON u.did = ur.duserid
      LEFT JOIN tblroles r ON ur.droleid = r.did
      LEFT JOIN tblusers s ON ur.dsupervisorid = s.did
      LEFT JOIN tblusers m ON ur.dmanagerid = m.did
      LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
      WHERE u.did = $1
    `;
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0 ? this.formatUserForManagement(result.rows[0]) : null;
  }

  /**
   * Get user by email for management
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmail(email) {
    const query = 'SELECT * FROM tblusers WHERE demail = $1';
    const result = await this.pool.query(query, [email]);
    
    return result.rows.length > 0 ? this.formatUserForManagement(result.rows[0]) : null;
  }

  /**
 * Track a failed login attempt
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address of the client
 * @param {string} userAgent - User agent of the client
 * @returns {Promise<boolean>} Success status
 */
async trackFailedLoginAttempt(userId, ipAddress = null, userAgent = null) {
  try {
    // Use the audit logs table instead of login logs
    await this.pool.query(
      `INSERT INTO tblauditlogs (duserid, daction, dtargettype, dtargetid, ddetails, tcreatedat) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        'LOGIN_FAILED',
        'user',
        userId,
        JSON.stringify({
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown'
        })
      ]
    );
    return true;
  } catch (error) {
    console.error('[User Model] Failed to log login attempt:', error);
    return false;
  }
}

/**
 * Count failed login attempts within a time period, but only since the last reset
 * @param {string} userId - User ID
 * @param {number} hours - Time period in hours (default: 24)
 * @returns {Promise<number>} Number of failed attempts
 */
async countFailedLoginAttempts(userId, hours = 24) {
  try {
    // First, find the timestamp of the last counter reset (if any)
    const resetQuery = `
      SELECT MAX(tcreatedat) as last_reset
      FROM tblauditlogs 
      WHERE duserid = $1 
      AND daction = 'LOGIN_COUNTER_RESET'
      AND tcreatedat > NOW() - INTERVAL '${hours} HOURS'
    `;
    const resetResult = await this.pool.query(resetQuery, [userId]);
    const lastReset = resetResult.rows[0].last_reset || null;
    
    // Build the query to count failed attempts
    let countQuery = `
      SELECT COUNT(*) as attempts 
      FROM tblauditlogs 
      WHERE duserid = $1 
      AND daction = 'LOGIN_FAILED' 
      AND tcreatedat > NOW() - INTERVAL '${hours} HOURS'
    `;
    
    // If there was a reset, only count failures after that reset
    const params = [userId];
    if (lastReset) {
      countQuery += ` AND tcreatedat > $2`;
      params.push(lastReset);
    }
    
    const result = await this.pool.query(countQuery, params);
    return parseInt(result.rows[0].attempts || '0', 10);
  } catch (error) {
    console.error('[User Model] Error checking previous login attempts:', error);
    return 0;
  }
}

/**
 * Lock a user account after too many failed login attempts
 * @param {string} userId - User ID
 * @param {string} reason - Reason for locking (optional)
 * @returns {Promise<boolean>} Success status
 */
async lockAccount(userId, reason = 'Too many failed login attempts') {
  try {
    await this.pool.query(
      `UPDATE tblusers 
       SET daccountstatus = $1, tupdatedat = NOW() 
       WHERE did = $2`,
      [UserModel.ACCOUNT_STATUS.LOCKED, userId]
    );
    
    // Record the lock action in the audit log with correct table name
    try {
      await this.pool.query(
        `INSERT INTO tblauditlogs (duserid, daction, dtargettype, dtargetid, ddetails, tcreatedat) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId, 
          'ACCOUNT_LOCKED', 
          'user',
          userId,
          JSON.stringify({ reason })
        ]
      );
    } catch (auditError) {
      // Non-fatal if audit logging fails
      console.warn('[User Model] Failed to record account lock in audit log:', auditError);
    }
    
    return true;
  } catch (error) {
    console.error('[User Model] Failed to lock account:', error);
    return false;
  }
}

/**
 * Reset login attempts after successful login
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address of the client
 * @param {string} userAgent - User agent of the client
 * @returns {Promise<boolean>} Success status
 */
async trackSuccessfulLogin(userId, ipAddress = null, userAgent = null) {
  try {
    // Log the successful attempt in audit logs
    await this.pool.query(
      `INSERT INTO tblauditlogs (duserid, daction, dtargettype, dtargetid, ddetails, tcreatedat) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        'LOGIN_SUCCESS',
        'user',
        userId,
        JSON.stringify({
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown'
        })
      ]
    );
    
    // Reset failed login attempts counter
    await this.resetFailedLoginAttempts(userId);
    
    // Update last login timestamp
    await this.updateLastLogin(userId);
    
    return true;
  } catch (error) {
    console.error('[User Model] Failed to log successful login:', error);
    return false;
  }
}

/**
 * Get max login attempts from global settings
 * @returns {Promise<number>} Max login attempts (default: 5)
 */
async getMaxLoginAttempts() {
  try {
    // Query the global settings table for the max login attempts
    const query = `
      SELECT dsettingvalue::jsonb->'maxLoginAttempts' as max_attempts
      FROM tblglobalsettings
      WHERE dsettingkey = 'general'
      LIMIT 1
    `;
    
    const result = await this.pool.query(query);
    
    // Extract the value or use default if not found
    if (result.rows.length > 0 && result.rows[0].max_attempts) {
      const maxAttempts = parseInt(result.rows[0].max_attempts, 10);
      return !isNaN(maxAttempts) && maxAttempts > 0 ? maxAttempts : 5;
    }
    
    return 5; // Default if not found
  } catch (error) {
    console.error('[User Model] Failed to get max login attempts:', error);
    return 5; // Default on error
  }
}

/**
 * Reset failed login attempts counter after successful login
 * This adds a marker in the audit log indicating that previous failed attempts should no longer count
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
async resetFailedLoginAttempts(userId) {
  try {
    // Add a "reset counter" entry to the audit logs
    await this.pool.query(
      `INSERT INTO tblauditlogs (duserid, daction, dtargettype, dtargetid, ddetails, tcreatedat) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        'LOGIN_COUNTER_RESET',
        'user',
        userId,
        JSON.stringify({
          reason: 'Successful login'
        })
      ]
    );
    return true;
  } catch (error) {
    console.error('[User Model] Failed to reset login attempts counter:', error);
    return false;
  }
}

  /**
   * Format user for management interface
   * @param {Object} user - Raw user object from database
   * @returns {Object} Formatted user object for management
   */
  formatUserForManagement(user) {
    if (!user) return null;

    return {
      id: user.did,
      employeeId: user.demployeeid,
      name: `${user.dfirstname} ${user.dlastname}`.trim(),
      email: user.demail,
      ou: user.ou_name || 'Unassigned', // Use joined OU name
      role: user.role_name || 'No Role', // Use joined role name
      status: user.daccountstatus,
      type: user.dtype || (user.role_name === 'Admin' ? 'admin' : 'user'),
      supervisorId: user.supervisor_id,
      managerId: user.manager_id,
      mustChangePassword: user.dmustchangepassword,
      presenceStatus: user.dpresencestatus,
      lastLogin: user.tlastlogin,
      lastSeen: user.tlastseen,
      joinDate: user.tjoindate,
      createdAt: user.tcreatedat,
      updatedAt: user.tupdatedat,
      // Include supervisor/manager names if joined
      supervisorName: user.supervisor_firstname && user.supervisor_lastname 
        ? `${user.supervisor_firstname} ${user.supervisor_lastname}`.trim()
        : null,
      managerName: user.manager_firstname && user.manager_lastname 
        ? `${user.manager_firstname} ${user.manager_lastname}`.trim()
        : null
    };
  }
}

module.exports = UserModel;