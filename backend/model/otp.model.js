const { Pool } = require('pg');

class OTPModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new OTP record
   * @param {Object} otpData - OTP data
   * @param {string} otpData.userId - User ID
   * @param {string} otpData.code - OTP code
   * @param {Date} otpData.expiresAt - Expiry timestamp
   * @returns {Promise<Object>} Created OTP record
   */
  async create({ userId, code, expiresAt }) {
    const query = `
      INSERT INTO tblotp (duserid, dotpcode, texpiresat) 
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [userId, code, expiresAt]);
    return result.rows[0];
  }

    /**
     * Find active OTP by code and user ID
     * @param {string} userId - User ID
     * @param {string} otpCode - OTP code
     * @returns {Promise<Object|null>} OTP object or null
     */
    async findActiveByCodeAndUserId(userId, otpCode) {
    const now = new Date();
    const query = `
        SELECT * FROM tblotp 
        WHERE duserid = $1 
        AND UPPER(dotpcode) = UPPER($2) 
        AND dusagestatus = false 
        AND texpiresat > $3
    `;
    
    const { rows } = await this.pool.query(query, [userId, otpCode, now]);
    return rows.length > 0 ? rows[0] : null;
    }

  /**
   * Mark an OTP as used
   * @param {string} otpId - OTP ID
   * @returns {Promise<Boolean>} Success status
   */
  async markAsUsed(otpId) {
    const now = new Date();
    const query = `
      UPDATE tblotp 
      SET dusagestatus = true, tusedat = $2
      WHERE did = $1
      RETURNING did
    `;
    
    const { rows } = await this.pool.query(query, [otpId, now]);
    return rows.length > 0;
  }

  /**
   * Generate a random alphanumeric OTP code
   * @param {number} length - Length of the OTP code
   * @returns {string} Generated OTP code
   */
  generateOTPCode(length = 6) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = OTPModel;