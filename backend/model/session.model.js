const { v4: uuidv4 } = require('uuid');

/**
 * User Session model for managing authentication sessions
 */
class SessionModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new session
   * @param {Object} sessionData - Session data
   * @param {string} sessionData.userId - User ID
   * @param {string} sessionData.sessionToken - Session token
   * @param {string} sessionData.refreshToken - Refresh token
   * @param {Date} sessionData.expiresAt - Expiry timestamp
   * @param {string} sessionData.ipAddress - IP address
   * @param {string} sessionData.userAgent - User agent string
   * @returns {Promise<Object>} Created session record
   */
  async create({ userId, sessionToken, refreshToken, expiresAt, ipAddress, userAgent }) {
    const query = `
      INSERT INTO tblusersessions (
        duserid, dsessiontoken, drefreshtoken, texpiresat, 
        dipaddress, duseragent, disactive
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      userId, sessionToken, refreshToken, expiresAt, 
      ipAddress, userAgent
    ]);
    
    return result.rows[0];
  }

  /**
   * Find session by session token
   * @param {string} sessionToken - Session token
   * @returns {Promise<Object|null>} Session object or null
   */
  async findBySessionToken(sessionToken) {
    const query = `
      SELECT * FROM tblusersessions
      WHERE dsessiontoken = $1
    `;

    try {
      const { rows } = await this.pool.query(query, [sessionToken]);
      
      if (rows.length === 0) {
        return null; // Remove console.log
      }
      
      const session = this.formatSession(rows[0]);
      // Remove detailed logging - only log errors
      
      return session;
    } catch (error) {
      console.error('[SessionModel] Error finding session:', error);
      throw error;
    }
  }

  /**
   * Find session by refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object|null>} Session object or null
   */
  async findByRefreshToken(refreshToken) {
    const query = `
      SELECT * FROM tblusersessions
      WHERE drefreshtoken = $1
    `;

    const { rows } = await this.pool.query(query, [refreshToken]);
    return rows.length ? this.formatSession(rows[0]) : null;
  }

  /**
   * Find all active sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of session objects
   */
  async findActiveByUserId(userId) {
    const query = `
      SELECT * FROM tblusersessions
      WHERE duserid = $1 AND disactive = true AND texpiresat > NOW()
    `;

    const { rows } = await this.pool.query(query, [userId]);
    return rows.map(this.formatSession);
  }

  /**
   * Invalidate a session (mark as inactive)
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidate(sessionId) {
    const query = `
      UPDATE tblusersessions 
      SET disactive = false
      WHERE did = $1
    `;
    
    const result = await this.pool.query(query, [sessionId]);
    return result.rowCount > 0;
  }

  /**
   * Invalidate all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAllForUser(userId) {
    const query = `
      UPDATE tblusersessions 
      SET disactive = false
      WHERE duserid = $1
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rowCount > 0;
  }

  /**
   * Update session expiry
   * @param {string} sessionId - Session ID
   * @param {Date} expiresAt - New expiry timestamp
   * @returns {Promise<Object|null>} Updated session or null
   */
  async updateExpiry(sessionId, expiresAt) {
    const query = `
      UPDATE tblusersessions
      SET texpiresat = $2
      WHERE did = $1
      RETURNING *
    `;

    const { rows } = await this.pool.query(query, [sessionId, expiresAt]);
    return rows.length ? this.formatSession(rows[0]) : null;
  }

  /**
 * Format session data from database
 * @param {Object} row - Database row
 * @returns {Object} Formatted session
 */
formatSession(row) {
  if (!row) return null;
  
  return {
      id: row.did,
      userId: row.duserid,
      sessionToken: row.dsessiontoken,
      refreshToken: row.drefreshtoken,
      expiresAt: row.texpiresat, // This should be a Date object or ISO string
      ipAddress: row.dipaddress,
      userAgent: row.duseragent,
      isActive: row.disactive,
      createdAt: row.tcreatedat
    };
  }
}

module.exports = SessionModel;