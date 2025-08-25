const { getPool } = require('../config/db');

class RetrieveBroadcastModel {
  constructor(pool) {
    this.pool = pool || getPool();
  }

  /**
   * Get broadcasts created by a specific user from tblbroadcasts
   * @param {string} userId - UUID of the user
   * @param {Object} options - Query options (limit, offset, status, priority)
   * @returns {Promise<Array>} Array of broadcasts from database
   */
  async getBroadcastsByUser(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      status = null,
      priority = null,
      includeDeleted = false
    } = options;

    try {
      const whereConditions = ['dcreatedby = $1'];
      const queryParams = [userId];
      let paramIndex = 2;

      // Filter out deleted broadcasts unless explicitly included
      if (!includeDeleted) {
        whereConditions.push('dstatus != $' + paramIndex);
        queryParams.push('deleted');
        paramIndex++;
      }

      if (status && status !== 'all') {
        whereConditions.push(`dstatus = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (priority && priority !== 'all') {
        whereConditions.push(`dpriority = $${paramIndex}`);
        queryParams.push(priority);
        paramIndex++;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
      
      // Query using existing tblbroadcasts schema
      const query = `
        SELECT 
          did, dtitle, dcontent, dpriority, dcreatedby, 
          drequiresacknowledgment, dresponsetype, dstatus, dchoices,
          tcreatedat, tscheduledfor, tsentat, teventdate, tenddate,
          dreportreason, dreportedby, treportedat
        FROM tblbroadcasts 
        ${whereClause}
        ORDER BY tcreatedat DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      console.log('Executing broadcast query:', query);
      console.log('With params:', queryParams);

      const result = await this.pool.query(query, queryParams);
      
      console.log(`Found ${result.rows.length} broadcasts for user ${userId}`);
      
      return this.formatBroadcasts(result.rows);
    } catch (error) {
      console.error('Database error in getBroadcastsByUser:', error);
      throw new Error(`Failed to fetch broadcasts from database: ${error.message}`);
    }
  }

  /**
   * Get broadcast statistics for a user from tblbroadcasts
   * @param {string} userId - UUID of the user
   * @returns {Promise<Object>} Statistics object from database
   */
  async getBroadcastStatsByUser(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN dstatus != 'deleted' THEN 1 END) as active,
          COUNT(CASE WHEN dpriority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN dpriority = 'medium' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN dpriority = 'low' THEN 1 END) as low_priority,
          COUNT(CASE WHEN dstatus = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN dstatus = 'scheduled' THEN 1 END) as scheduled,
          COUNT(CASE WHEN dstatus = 'draft' THEN 1 END) as draft
        FROM tblbroadcasts 
        WHERE dcreatedby = $1
      `;
      
      const result = await this.pool.query(query, [userId]);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        acknowledged: 0, // Not tracked in current schema
        byPriority: {
          high: parseInt(stats.high_priority),
          medium: parseInt(stats.medium_priority),
          low: parseInt(stats.low_priority)
        },
        byStatus: {
          sent: parseInt(stats.sent),
          scheduled: parseInt(stats.scheduled),
          draft: parseInt(stats.draft),
          archived: 0, // Add when needed
          deleted: parseInt(stats.total) - parseInt(stats.active)
        }
      };
    } catch (error) {
      console.error('Database error in getBroadcastStatsByUser:', error);
      throw new Error(`Failed to fetch broadcast statistics: ${error.message}`);
    }
  }

  /**
   * Get a specific broadcast by ID
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<Object|null>} Broadcast object or null
   */
  async getBroadcastById(broadcastId, userId) {
    try {
      const query = `
        SELECT 
          did, dtitle, dcontent, dpriority, dcreatedby, 
          drequiresacknowledgment, dresponsetype, dstatus, dchoices,
          tcreatedat, tscheduledfor, tsentat, teventdate, tenddate,
          dreportreason, dreportedby, treportedat
        FROM tblbroadcasts 
        WHERE did = $1 AND dcreatedby = $2 AND dstatus != 'deleted'
      `;
      
      const result = await this.pool.query(query, [broadcastId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.formatBroadcast(result.rows[0]);
    } catch (error) {
      console.error('Database error in getBroadcastById:', error);
      throw new Error(`Failed to fetch broadcast: ${error.message}`);
    }
  }

  /**
   * Format broadcast data from database to match frontend expectations
   * @param {Array} broadcasts - Raw broadcast data from database
   * @returns {Array} Formatted broadcasts
   */
  formatBroadcasts(broadcasts) {
    return broadcasts.map(broadcast => this.formatBroadcast(broadcast));
  }

  /**
   * Format single broadcast data from database to match frontend expectations
   * @param {Object} broadcast - Raw broadcast data from database
   * @returns {Object} Formatted broadcast
   */
  formatBroadcast(broadcast) {
    if (!broadcast) return null;

    return {
      id: broadcast.did,
      title: broadcast.dtitle,
      content: broadcast.dcontent,
      priority: broadcast.dpriority,
      createdBy: broadcast.dcreatedby,
      requiresAcknowledgment: broadcast.drequiresacknowledgment || false,
      responseType: broadcast.dresponsetype || 'none',
      status: broadcast.dstatus || 'draft',
      choices: broadcast.dchoices,
      createdAt: broadcast.tcreatedat,
      scheduledFor: broadcast.tscheduledfor,
      sentAt: broadcast.tsentat,
      eventDate: broadcast.teventdate,
      endDate: broadcast.tenddate,
      reportReason: broadcast.dreportreason,
      reportedBy: broadcast.dreportedby,
      reportedAt: broadcast.treportedat,
      
      // Frontend compatibility fields (using defaults since not in current schema)
      targetRoles: ['admin', 'manager', 'supervisor'], // Default roles
      targetOUs: ['All'], // Default organizational units
      acknowledgments: [], // Empty array since not tracked in current schema
      isActive: broadcast.dstatus !== 'deleted' && broadcast.dstatus !== 'archived'
    };
  }

  /**
   * Create a new broadcast using existing schema
   * @param {Object} broadcastData - Broadcast data
   * @returns {Promise<Object>} Created broadcast
   */
  async createBroadcast(broadcastData) {
    const {
      title,
      content,
      priority = 'medium',
      createdBy,
      requiresAcknowledgment = false,
      responseType = 'none',
      status = 'draft',
      scheduledFor = null,
      eventDate = null,
      endDate = null,
      choices = null
    } = broadcastData;

    try {
      const query = `
        INSERT INTO tblbroadcasts (
          dtitle, dcontent, dpriority, dcreatedby, 
          drequiresacknowledgment, dresponsetype, dstatus,
          tscheduledfor, teventdate, tenddate, dchoices
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        title,
        content,
        priority,
        createdBy,
        requiresAcknowledgment,
        responseType,
        status,
        scheduledFor,
        eventDate,
        endDate,
        choices ? JSON.stringify(choices) : null
      ];

      const result = await this.pool.query(query, values);
      return this.formatBroadcast(result.rows[0]);
    } catch (error) {
      console.error('Database error in createBroadcast:', error);
      throw new Error(`Failed to create broadcast: ${error.message}`);
    }
  }
}

module.exports = RetrieveBroadcastModel;