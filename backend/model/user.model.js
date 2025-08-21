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
   * Update user password
   * @param {string} id - User ID
   * @param {string} newPassword - New password (plain text)
   * @returns {Promise<boolean>} Success status
   */
  async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    const query = `
      UPDATE tblusers 
      SET dpasswordhash = $1, dmustchangepassword = false, tupdatedat = $2
      WHERE did = $3
    `;

    const result = await this.pool.query(query, [passwordHash, new Date(), id]);
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
}

module.exports = UserModel;