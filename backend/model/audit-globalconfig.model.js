const { getPool } = require('../config/db');

class AuditLogModel {
  constructor() {
    this.pool = getPool();
  }

  /**
   * Create an audit log entry
   * @param {Object} logData - The audit log data
   * @param {string} logData.userId - User ID who performed the action
   * @param {string} logData.action - Action performed
   * @param {string} logData.targetType - Type of target (e.g., 'config', 'user', 'ou')
   * @param {string} logData.targetId - ID of the target (optional)
   * @param {Object} logData.details - Additional details as JSON
   * @param {string} logData.ipAddress - IP address of the user
   * @param {string} logData.userAgent - User agent string
   * @returns {Promise<Object>}
   */
  async createAuditLog(logData) {
    const query = `
      INSERT INTO tblauditlogs (duserid, daction, dtargettype, dtargetid, ddetails, dipaddress, duseragent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      logData.userId,
      logData.action,
      logData.targetType,
      logData.targetId || null,
      logData.details ? JSON.stringify(logData.details) : null,
      logData.ipAddress || null,
      logData.userAgent || null
    ];

    const { rows } = await this.pool.query(query, values);
    return rows[0];
  }

  /**
   * Get audit logs with optional filtering
   * @param {Object} filters - Filter options
   * @param {number} limit - Limit number of results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>}
   */
  async getAuditLogs(filters = {}, limit = 100, offset = 0) {
    let query = `
      SELECT 
        al.*,
        u.dusername as username,
        u.dfirstname as firstname,
        u.dlastname as lastname
      FROM tblauditlogs al
      LEFT JOIN tblusers u ON al.duserid = u.did
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;

    if (filters.userId) {
      query += ` AND al.duserid = $${paramCount++}`;
      values.push(filters.userId);
    }

    if (filters.action) {
      query += ` AND al.daction = $${paramCount++}`;
      values.push(filters.action);
    }

    if (filters.targetType) {
      query += ` AND al.dtargettype = $${paramCount++}`;
      values.push(filters.targetType);
    }

    query += ` ORDER BY al.tcreatedat DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(limit, offset);

    const { rows } = await this.pool.query(query, values);
    return rows;
  }
}

module.exports = new AuditLogModel();