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

    // Only broadcasts with dstatus === 'done' should be considered completed.
    // Deleted and archived should not be shown in completed.
    const isActive =
      broadcast.dstatus !== 'done' &&
      broadcast.dstatus !== 'deleted' &&
      broadcast.dstatus !== 'archived';

    const isCompleted =
      broadcast.dstatus === 'done';

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
      creatorFirstName: broadcast.creator_firstname || '',
      creatorLastName: broadcast.creator_lastname || '',
      scheduledFor: broadcast.tscheduledfor,
      sentAt: broadcast.tsentat,
      eventDate: broadcast.teventdate,
      endDate: broadcast.tenddate,
      reportReason: broadcast.dreportreason,
      reportedBy: broadcast.dreportedby,
      reportedAt: broadcast.treportedat,

      // Frontend compatibility fields (using defaults since not in current schema)
      targetRoles: [],
      targetOUs: [],
      acknowledgments: [],
      isActive,
      isCompleted // <-- Add this field for frontend to easily filter completed broadcasts
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

  /**
   * Update the status of a broadcast
   * @param {string} broadcastId
   * @param {string} userId
   * @param {string} status
   * @returns {Promise<Object>} Updated broadcast
   */
  async updateBroadcastStatus(broadcastId, userId, status) {
    try {
      const query = `
        UPDATE tblbroadcasts
        SET dstatus = $1
        WHERE did = $2 AND dcreatedby = $3
        RETURNING *
      `;
      const values = [status, broadcastId, userId];
      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Broadcast not found or not authorized');
      }

      return this.formatBroadcast(result.rows[0]);
    } catch (error) {
      console.error('Database error in updateBroadcastStatus:', error);
      throw new Error(`Failed to update broadcast status: ${error.message}`);
    }
  }

 /**
   * Get broadcasts received by a user (must match both role and OU)
   * @param {Object} options
   * @param {string} options.userRoleId - User's role ID
   * @param {string} options.userOuId - User's OU ID
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   * @param {string} [options.status]
   * @param {string} [options.priority]
   * @returns {Promise<Array>}
   */
  async getReceivedBroadcasts({ userRoleId, userOuId, userId, limit = 50, offset = 0, status, priority, includeTargets = false }) {
    const params = [userRoleId, userOuId];
    let paramIndex = 3;
    let whereConditions = [];

    // Add condition to exclude broadcasts created by the current user
    params.push(userId);
    whereConditions.push(`b.dcreatedby != $${paramIndex++}`);

    if (status && status !== 'all') {
      whereConditions.push(`b.dstatus = $${paramIndex++}`);
      params.push(status);
    }
    if (priority && priority !== 'all') {
      whereConditions.push(`b.dpriority = $${paramIndex++}`);
      params.push(priority);
    }

    const whereClause = (whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '');

    const query = `
      SELECT b.*, u.dfirstname AS creator_firstname, u.dlastname AS creator_lastname
      FROM tblbroadcasts b
      JOIN tblusers u ON b.dcreatedby = u.did
      WHERE EXISTS (
        SELECT 1 FROM tblbroadcasttargets t
        WHERE t.dbroadcastid = b.did
          AND t.dtargettype = 'role'
          AND t.dtargetid = $1
      )
      AND EXISTS (
        SELECT 1 FROM tblbroadcasttargets t
        WHERE t.dbroadcastid = b.did
          AND t.dtargettype = 'ou'
          AND t.dtargetid = $2
      )
      ${whereClause}
      ORDER BY b.tcreatedat DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    params.push(limit, offset);

    const { rows } = await this.pool.query(query, params);

    // Get broadcast targets for all fetched broadcasts
    const broadcasts = this.formatBroadcasts(rows);
    
    // If includeTargets flag is true, fetch the target details for each broadcast
    if (includeTargets && broadcasts.length > 0) {
      await this.attachTargetsToManyBroadcasts(broadcasts);
    }
    
    return broadcasts;
  }

  async attachTargetsToManyBroadcasts(broadcasts) {
    if (!broadcasts || broadcasts.length === 0) return;
    
    const broadcastIds = broadcasts.map(b => b.id)
    
    // Query to get all role targets with names
    const roleQuery = `
      SELECT bt.dbroadcastid, r.dname, bt.dtargetid
      FROM tblbroadcasttargets bt
      JOIN tblroles r ON bt.dtargetid = r.did
      WHERE bt.dbroadcastid = ANY($1) AND bt.dtargettype = 'role'
    `;
    
    // Query to get all OU targets with names
    const ouQuery = `
      SELECT bt.dbroadcastid, ou.dname, bt.dtargetid
      FROM tblbroadcasttargets bt
      JOIN tblorganizationalunits ou ON bt.dtargetid = ou.did
      WHERE bt.dbroadcastid = ANY($1) AND bt.dtargettype = 'ou'
    `;


    const [roleResult, ouResult] = await Promise.all([
      this.pool.query(roleQuery, [broadcastIds]),
      this.pool.query(ouQuery, [broadcastIds])
    ]);
    
    // Create lookup maps for roles and OUs by broadcast ID
    const roleLookup = {};
    const ouLookup = {};
    
    roleResult.rows.forEach(row => {
      if (!roleLookup[row.dbroadcastid]) roleLookup[row.dbroadcastid] = [];
      roleLookup[row.dbroadcastid].push(row.dname);
    });
    
    ouResult.rows.forEach(row => {
      if (!ouLookup[row.dbroadcastid]) ouLookup[row.dbroadcastid] = [];
      ouLookup[row.dbroadcastid].push(row.dname);
    });
    
    // Attach the target names to each broadcast
    broadcasts.forEach(broadcast => {
      broadcast.targetRoles = roleLookup[broadcast.id] || [];
      broadcast.targetRoles = roleLookup[broadcast.id] || [];
      broadcast.targetOUs = ouLookup[broadcast.id] || [];
      
      // Only use 'All' if no targets were found
      if (broadcast.targetRoles.length === 0) broadcast.targetRoles = ['All'];
      if (broadcast.targetOUs.length === 0) broadcast.targetOUs = ['All'];
    });
    
    return broadcasts;
  }

  /**
   * Get broadcast statistics for a user from tblbroadcasts
   * @param {string} userId - UUID of the user
   * @returns {Promise<Object>} Statistics object from database
   */
  async getBroadcastStatsByUser(userId) {
    try {
      // First, get overall broadcast statistics
      const overallStatsQuery = `
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
      
      // Next, get acknowledgment counts for each broadcast
      const acknowledgementsQuery = `
        SELECT 
          b.did as broadcast_id,
          COUNT(a.did) as ack_count
        FROM tblbroadcasts b
        LEFT JOIN tblbroadcastacknowledgments a ON b.did = a.dbroadcastid
        WHERE b.dcreatedby = $1
        GROUP BY b.did
      `;
      
      const [statsResult, ackResult] = await Promise.all([
        this.pool.query(overallStatsQuery, [userId]),
        this.pool.query(acknowledgementsQuery, [userId])
      ]);
      
      const stats = statsResult.rows[0];
      
      // Create a map of broadcast ID to acknowledgment count
      const broadcastAcknowledgments = {};
      ackResult.rows.forEach(row => {
        broadcastAcknowledgments[row.broadcast_id] = parseInt(row.ack_count);
      });
      
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        acknowledged: 0, // Overall acknowledgment count if needed
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
        },
        // Add broadcast-specific acknowledgment counts
        broadcastAcknowledgments: broadcastAcknowledgments
      };
    } catch (error) {
      console.error('Database error in getBroadcastStatsByUser:', error);
      throw new Error(`Failed to fetch broadcast statistics: ${error.message}`);
    }
  }
}

module.exports = RetrieveBroadcastModel;