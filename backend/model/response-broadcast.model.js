const { getPool } = require('../config/db');

class ResponseBroadcastModel {
  constructor(pool) {
    this.pool = pool || getPool();
  }

  /**
   * Create a new broadcast response/acknowledgment
   * @param {Object} responseData - Response data
   * @returns {Promise<Object>} Created response
   */
  async createBroadcastResponse({
    broadcastId,
    userId,
    responseData
  }) {
    try {
      const query = `
        INSERT INTO tblbroadcastacknowledgments (
          dbroadcastid,
          duserid,
          dresponsedata
        ) 
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const values = [
        broadcastId,
        userId,
        JSON.stringify(responseData)
      ];

      const result = await this.pool.query(query, values);
      return this.formatResponse(result.rows[0]);
    } catch (error) {
      console.error('Database error in createBroadcastResponse:', error);
      throw new Error(`Failed to create broadcast response: ${error.message}`);
    }
  }

  /**
   * Get responses for a specific broadcast
   * @param {string} broadcastId - Broadcast ID
   * @returns {Promise<Array>} Array of responses
   */
  async getResponsesByBroadcastId(broadcastId) {
    try {
      const query = `
        SELECT ba.*, u.dusername, u.dfirstname, u.dlastname, u.demail
        FROM tblbroadcastacknowledgments ba
        LEFT JOIN tblusers u ON ba.duserid = u.did
        WHERE ba.dbroadcastid = $1
        ORDER BY ba.tackedat DESC
      `;

      const result = await this.pool.query(query, [broadcastId]);
      return result.rows.map(row => this.formatResponseWithUser(row));
    } catch (error) {
      console.error('Database error in getResponsesByBroadcastId:', error);
      throw new Error(`Failed to fetch broadcast responses: ${error.message}`);
    }
  }

  /**
   * Get user's response for a specific broadcast
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User's response or null
   */
  async getUserResponseForBroadcast(broadcastId, userId) {
    try {
      const query = `
        SELECT * FROM tblbroadcastacknowledgments
        WHERE dbroadcastid = $1 AND duserid = $2
      `;

      const result = await this.pool.query(query, [broadcastId, userId]);
      return result.rows.length > 0 ? this.formatResponse(result.rows[0]) : null;
    } catch (error) {
      console.error('Database error in getUserResponseForBroadcast:', error);
      throw new Error(`Failed to fetch user response: ${error.message}`);
    }
  }

  /**
   * Update an existing response
   * @param {string} responseId - Response ID
   * @param {Object} responseData - Updated response data
   * @returns {Promise<Object>} Updated response
   */
  async updateBroadcastResponse(responseId, responseData) {
    try {
      const query = `
        UPDATE tblbroadcastacknowledgments
        SET dresponsedata = $1, tackedat = NOW()
        WHERE did = $2
        RETURNING *
      `;

      const values = [JSON.stringify(responseData), responseId];
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Response not found');
      }

      return this.formatResponse(result.rows[0]);
    } catch (error) {
      console.error('Database error in updateBroadcastResponse:', error);
      throw new Error(`Failed to update broadcast response: ${error.message}`);
    }
  }

  /**
   * Delete a broadcast response
   * @param {string} responseId - Response ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  async deleteBroadcastResponse(responseId, userId) {
    try {
      const query = `
        DELETE FROM tblbroadcastacknowledgments
        WHERE did = $1 AND duserid = $2
        RETURNING did
      `;

      const result = await this.pool.query(query, [responseId, userId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Database error in deleteBroadcastResponse:', error);
      throw new Error(`Failed to delete broadcast response: ${error.message}`);
    }
  }

  /**
   * Get response statistics for a broadcast
   * @param {string} broadcastId - Broadcast ID
   * @returns {Promise<Object>} Response statistics
   */
  async getBroadcastResponseStats(broadcastId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_responses,
          COUNT(CASE WHEN dresponsedata->>'responseType' = 'required' THEN 1 END) as acknowledgments,
          COUNT(CASE WHEN dresponsedata->>'responseType' = 'preferred-date' THEN 1 END) as date_responses,
          COUNT(CASE WHEN dresponsedata->>'responseType' = 'choices' THEN 1 END) as choice_responses,
          COUNT(CASE WHEN dresponsedata->>'responseType' = 'textbox' THEN 1 END) as text_responses
        FROM tblbroadcastacknowledgments
        WHERE dbroadcastid = $1
      `;

      const result = await this.pool.query(query, [broadcastId]);
      const stats = result.rows[0];

      return {
        totalResponses: parseInt(stats.total_responses),
        acknowledgments: parseInt(stats.acknowledgments),
        dateResponses: parseInt(stats.date_responses),
        choiceResponses: parseInt(stats.choice_responses),
        textResponses: parseInt(stats.text_responses)
      };
    } catch (error) {
      console.error('Database error in getBroadcastResponseStats:', error);
      throw new Error(`Failed to fetch response statistics: ${error.message}`);
    }
  }

  /**
   * Format a response from DB row
   * @param {Object} response - Raw response from DB
   * @returns {Object} Formatted response
   */
  formatResponse(response) {
    if (!response) return null;

    return {
      id: response.did,
      broadcastId: response.dbroadcastid,
      userId: response.duserid,
      responseData: response.dresponsedata,
      acknowledgedAt: response.tackedat
    };
  }

  /**
   * Format a response with user information
   * @param {Object} response - Raw response from DB with user data
   * @returns {Object} Formatted response with user info
   */
  formatResponseWithUser(response) {
    if (!response) return null;

    return {
      id: response.did,
      broadcastId: response.dbroadcastid,
      userId: response.duserid,
      responseData: response.dresponsedata,
      acknowledgedAt: response.tackedat,
      user: {
        username: response.dusername,
        firstName: response.dfirstname,
        lastName: response.dlastname,
        email: response.demail
      }
    };
  }
}

module.exports = ResponseBroadcastModel;