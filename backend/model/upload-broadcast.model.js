class UploadBroadcastModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new broadcast
   * @param {Object} broadcastData - Broadcast data
   * @returns {Promise<Object>} Created broadcast
   */
  async createBroadcast({
    title,
    content,
    priority,
    createdBy,
    responseType = 'none',
    requiresAcknowledgment = false,
    status = 'sent',
    scheduledFor = null,
    endDate = null,
    choices = null // Add this parameter
  }) {
    // Determine sent date based on schedule type
    const now = new Date();
    // If sending immediately, set sentAt to now. If scheduled, set to scheduledFor
    const sentAt = status === 'sent' ? now : scheduledFor;
    
    const query = `
      INSERT INTO tblbroadcasts (
        dtitle, 
        dcontent, 
        dpriority, 
        dcreatedby, 
        dstatus, 
        drequiresacknowledgment, 
        dresponsetype,
        tscheduledfor,
        tsentat,
        teventdate,
        tenddate,
        dchoices
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      title,
      content,
      priority,
      createdBy,
      status,
      requiresAcknowledgment,
      responseType,
      scheduledFor,    // tscheduledfor - null if immediate, date if scheduled
      sentAt,          // tsentat - NOW() if immediate, scheduledFor if scheduled
      sentAt,          // teventdate - follows same rules as tsentat
      endDate,         // tenddate - optional end date
      choices ? JSON.stringify(choices) : null  // Convert choices array to JSON string
    ];

    const result = await this.pool.query(query, values);
    return this.formatBroadcast(result.rows[0]);
  }

  /**
   * Add targets for a broadcast
   * @param {string} broadcastId - Broadcast ID
   * @param {Array} targets - Array of targets {type, id, name}
   * @returns {Promise<Array>} Created targets
   */
  async addBroadcastTargets(broadcastId, targets) {
    const query = `
      INSERT INTO tblbroadcasttargets (
        dbroadcastid,
        dtargettype,
        dtargetid,
        dtargetname
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const createdTargets = [];

    for (const target of targets) {
      const values = [
        broadcastId,
        target.type,
        target.id,
        target.name
      ];

      const result = await this.pool.query(query, values);
      createdTargets.push(this.formatBroadcastTarget(result.rows[0]));
    }

    return createdTargets;
  }

  /**
   * Get all organizational units for broadcast targeting
   * @returns {Promise<Array>} Array of organizational units
   */
  async getOrganizationalUnits() {
    const query = `
      SELECT did, dname FROM tblorganizationalunits
      ORDER BY dname ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.did,
      name: row.dname
    }));
  }

  /**
   * Get all roles for broadcast targeting
   * @returns {Promise<Array>} Array of roles
   */
  async getRoles() {
    const query = `
      SELECT did, dname FROM tblroles
      ORDER BY dname ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.did,
      name: row.dname
    }));
  }

  /**
   * Format a broadcast from DB row
   * @param {Object} broadcast - Raw broadcast from DB
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
      createdAt: broadcast.tcreatedat,
      scheduledFor: broadcast.tscheduledfor,
      sentAt: broadcast.tsentat,
      eventDate: broadcast.teventdate,
      endDate: broadcast.tenddate,
      status: broadcast.dstatus,
      requiresAcknowledgment: broadcast.drequiresacknowledgment,
      responseType: broadcast.dresponsetype,
      choices: broadcast.dchoices
    };
  }

  /**
   * Format a broadcast target from DB row
   * @param {Object} target - Raw broadcast target from DB
   * @returns {Object} Formatted broadcast target
   */
  formatBroadcastTarget(target) {
    if (!target) return null;
    
    return {
      id: target.did,
      broadcastId: target.dbroadcastid,
      targetType: target.dtargettype,
      targetId: target.dtargetid,
      targetName: target.dtargetname
    };
  }
}

module.exports = UploadBroadcastModel;