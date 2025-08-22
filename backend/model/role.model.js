/**
 * Role model for managing user roles
 */
class RoleModel {
  constructor(pool) {
    this.pool = pool;
    this.tableName = 'tblroles';
  }

  /**
   * Create a new role
   * @param {Object} roleData - Role data
   * @param {string} roleData.name - Role name
   * @param {number} roleData.hierarchyLevel - Role hierarchy level (1-5)
   * @param {Object} [roleData.permissions] - Role permissions as JSON
   * @returns {Promise<Object>} Created role
   */
  async create({ name, hierarchyLevel, permissions = {} }) {
    // Validate hierarchy level
    if (hierarchyLevel < 1 || hierarchyLevel > 5) {
      throw new Error('Hierarchy level must be between 1 and 5');
    }

    const query = `
      INSERT INTO ${this.tableName} (dname, dhierarchylevel, dpermissions)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [name, hierarchyLevel, JSON.stringify(permissions)];
    const { rows } = await this.pool.query(query, values);
    return this.formatRole(rows[0]);
  }

  /**
   * Find role by ID
   * @param {string} id - Role ID
   * @returns {Promise<Object|null>} Role object or null
   */
  async findById(id) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE did = $1
    `;

    const { rows } = await this.pool.query(query, [id]);
    return rows.length ? this.formatRole(rows[0]) : null;
  }

  /**
   * Find role by name
   * @param {string} name - Role name
   * @returns {Promise<Object|null>} Role object or null
   */
  async findByName(name) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE dname = $1
    `;

    const { rows } = await this.pool.query(query, [name]);
    return rows.length ? this.formatRole(rows[0]) : null;
  }

  /**
   * Get all roles
   * @returns {Promise<Array>} Array of role objects
   */
  async findAll() {
    const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY dhierarchylevel ASC
    `;

    const { rows } = await this.pool.query(query);
    return rows.map(this.formatRole);
  }

  /**
   * Update role
   * @param {string} id - Role ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated role or null
   */
  async update(id, updates) {
    // Build dynamic update query based on provided fields
    const setFields = [];
    const values = [id];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      setFields.push(`dname = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.hierarchyLevel !== undefined) {
      // Validate hierarchy level
      if (updates.hierarchyLevel < 1 || updates.hierarchyLevel > 5) {
        throw new Error('Hierarchy level must be between 1 and 5');
      }
      
      setFields.push(`dhierarchylevel = $${paramIndex}`);
      values.push(updates.hierarchyLevel);
      paramIndex++;
    }

    if (updates.permissions !== undefined) {
      setFields.push(`dpermissions = $${paramIndex}`);
      values.push(JSON.stringify(updates.permissions));
      paramIndex++;
    }

    if (setFields.length === 0) {
      return this.findById(id); // No updates to make
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${setFields.join(', ')}
      WHERE did = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query(query, values);
    return rows.length ? this.formatRole(rows[0]) : null;
  }

  /**
   * Format role object
   * @param {Object} roleData - Raw role data
   * @returns {Object} Formatted role
   */
  formatRole(roleData) {
    if (!roleData) return null;

    return {
      id: roleData.did,
      name: roleData.dname,
      hierarchyLevel: roleData.dhierarchylevel,
      permissions: roleData.dpermissions,
      createdAt: roleData.tcreatedat
    };
  }
}

module.exports = RoleModel;