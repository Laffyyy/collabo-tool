const { v4: uuidv4 } = require('uuid');

class PasswordResetModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new password reset record
   * @param {Object} resetData - Reset data
   * @param {string} resetData.userId - User ID
   * @param {string} resetData.tokenHash - Hashed reset token
   * @param {Date} resetData.expiresAt - Expiry timestamp
   * @returns {Promise<Object>} Created reset record
   */
  async create({ userId, tokenHash, expiresAt }) {
    const query = `
      INSERT INTO tblpasswordresettokens (duserid, dtoken, texpiresat) 
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
  }

  /**
   * Find a valid (unused and not expired) reset token
   * @param {string} tokenHash - Hashed token to find
   * @returns {Promise<Object|null>} Reset record or null
   */
  async findValidToken(tokenHash) {
    const query = `
      SELECT * FROM tblpasswordresettokens 
      WHERE dtoken = $1 
        AND tusedat IS NULL 
        AND texpiresat > NOW()
      ORDER BY tcreatedat DESC
      LIMIT 1
    `;
    
    const result = await this.pool.query(query, [tokenHash]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Mark a reset token as used
   * @param {string} id - Reset record ID
   * @returns {Promise<boolean>} Success status
   */
  async markAsUsed(id) {
    const query = `
      UPDATE tblpasswordresettokens 
      SET tusedat = NOW()
      WHERE did = $1
    `;
    
    const result = await this.pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Clean up expired reset tokens (utility function)
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupExpired() {
    const query = `
      DELETE FROM tblpasswordresettokens 
      WHERE texpiresat < NOW() OR tusedat IS NOT NULL
    `;
    
    const result = await this.pool.query(query);
    return result.rowCount;
  }
}

module.exports = PasswordResetModel;