
/**
 * UserRole model for managing user role assignments
 */
class UserRoleModel {
  constructor(pool) {
    this.pool = pool;
    this.tableName = 'tbluserroles';
  }

  /**
   * Assign a role to a user
   * @param {Object} assignment - Role assignment data
   * @param {string} assignment.userId - User ID
   * @param {string} assignment.roleId - Role ID
   * @param {string} [assignment.ouId] - Organizational unit ID
   * @param {string} [assignment.supervisorId] - Supervisor user ID
   * @param {string} [assignment.managerId] - Manager user ID
   * @returns {Promise<Object>} Created role assignment
   */
  async assign({
    userId,
    roleId,
    ouId = null,
    supervisorId = null,
    managerId = null
  }) {
    const query = `
      INSERT INTO ${this.tableName} (
        duserid, droleid, douid, dsupervisorid, dmanagerid
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [userId, roleId, ouId, supervisorId, managerId];

    try {
      const { rows } = await this.pool.query(query, values);
      return this.formatUserRole(rows[0]);
    } catch (err) {
      // Handle unique constraint violation gracefully
      if (err.code === '23505') { // unique_violation code
        throw new Error('This role assignment already exists');
      }
      throw err;
    }
  }

  /**
   * Find role assignments by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of role assignments
   */
  async findByUserId(userId) {
    const query = `
      SELECT ur.*, r.dname as rolename, r.dhierarchylevel
      FROM ${this.tableName} ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.duserid = $1
    `;

    const { rows } = await this.pool.query(query, [userId]);
    return rows.map(this.formatUserRole);
  }

  /**
   * Find role assignments by role ID
   * @param {string} roleId - Role ID
   * @returns {Promise<Array>} Array of role assignments
   */
  async findByRoleId(roleId) {
    const query = `
      SELECT ur.*, r.dname as rolename, r.dhierarchylevel
      FROM ${this.tableName} ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.droleid = $1
    `;

    const { rows } = await this.pool.query(query, [roleId]);
    return rows.map(this.formatUserRole);
  }

  /**
   * Find users by role in an organizational unit
   * @param {string} roleId - Role ID
   * @param {string} ouId - Organizational unit ID
   * @returns {Promise<Array>} Array of role assignments
   */
  async findByRoleAndOu(roleId, ouId) {
    const query = `
      SELECT ur.*, r.dname as rolename, r.dhierarchylevel
      FROM ${this.tableName} ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.droleid = $1 AND ur.douid = $2
    `;

    const { rows } = await this.pool.query(query, [roleId, ouId]);
    return rows.map(this.formatUserRole);
  }

  /**
   * Get users supervised by a specific user
   * @param {string} supervisorId - Supervisor user ID
   * @returns {Promise<Array>} Array of role assignments
   */
  async findBySupervisorId(supervisorId) {
    const query = `
      SELECT ur.*, r.dname as rolename, r.dhierarchylevel
      FROM ${this.tableName} ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.dsupervisorid = $1
    `;

    const { rows } = await this.pool.query(query, [supervisorId]);
    return rows.map(this.formatUserRole);
  }

  /**
   * Get users managed by a specific user
   * @param {string} managerId - Manager user ID
   * @returns {Promise<Array>} Array of role assignments
   */
  async findByManagerId(managerId) {
    const query = `
      SELECT ur.*, r.dname as rolename, r.dhierarchylevel
      FROM ${this.tableName} ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.dmanagerid = $1
    `;

    const { rows } = await this.pool.query(query, [managerId]);
    return rows.map(this.formatUserRole);
  }

  /**
   * Remove a role assignment
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<boolean>} Success status
   */
  async remove(assignmentId) {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE did = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query(query, [assignmentId]);
    return rows.length > 0;
  }

  /**
   * Update a role assignment
   * @param {string} assignmentId - Assignment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated assignment or null
   */
  async update(assignmentId, updates) {
    // Build dynamic update query based on provided fields
    const setFields = [];
    const values = [assignmentId];
    let paramIndex = 2;

    if (updates.supervisorId !== undefined) {
      setFields.push(`dsupervisorid = $${paramIndex}`);
      values.push(updates.supervisorId);
      paramIndex++;
    }

    if (updates.managerId !== undefined) {
      setFields.push(`dmanagerid = $${paramIndex}`);
      values.push(updates.managerId);
      paramIndex++;
    }

    if (updates.ouId !== undefined) {
      setFields.push(`douid = $${paramIndex}`);
      values.push(updates.ouId);
      paramIndex++;
    }

    if (setFields.length === 0) {
      return null; // No updates to make
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${setFields.join(', ')}
      WHERE did = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query(query, values);
    return rows.length ? this.formatUserRole(rows[0]) : null;
  }

  /**
   * Format user role object
   * @param {Object} userRoleData - Raw user role data
   * @returns {Object} Formatted user role
   */
  formatUserRole(userRoleData) {
    if (!userRoleData) return null;

    return {
      id: userRoleData.did,
      userId: userRoleData.duserid,
      roleId: userRoleData.droleid,
      roleName: userRoleData.rolename,
      hierarchyLevel: userRoleData.dhierarchylevel,
      ouId: userRoleData.douid,
      supervisorId: userRoleData.dsupervisorid,
      managerId: userRoleData.dmanagerid,
      assignedAt: userRoleData.tassignedat
    };
  }
}

module.exports = UserRoleModel;