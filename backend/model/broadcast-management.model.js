const { NotFoundError } = require('../utils/errors');

class BroadcastManagementModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Get all broadcasts for admin management
   */
  async getAllBroadcasts({ limit = 50, offset = 0, search, priority, status }) {
    try {
      let query = `
        SELECT 
          b.did as id,
          b.dtitle as title,
          b.dcontent as content,
          b.dpriority as priority,
          b.dtargetrole as "targetRoles",
          b.dtargetou as "targetOUs",
          u.demail as "createdByEmail",
          b.tcreatedat as "createdAt",
          b.tscheduledfor as "scheduledFor",
          b.tsentat as "sentAt",
          b.dstatus as status,
          b.drequiresacknowledgment as "requiresAcknowledgment",
          COALESCE(ba.acknowledgment_count, 0) as "acknowledgmentCount",
          COALESCE(bt.recipient_count, 0) as "totalRecipients",
          b.teventdate as "eventDate",
          b.dreportreason as "reportReason",
          b.dreportedby as "reportedBy",
          b.treportedat as "reportedAt"
        FROM tblbroadcasts b
        LEFT JOIN tblusers u ON b.dcreatedby = u.did
        LEFT JOIN (
          SELECT 
            dbroadcastid, 
            COUNT(*) as acknowledgment_count 
          FROM tblbroadcastacknowledgments 
          GROUP BY dbroadcastid
        ) ba ON b.did = ba.dbroadcastid
        LEFT JOIN (
          SELECT 
            dbroadcastid, 
            COUNT(*) as recipient_count 
          FROM tblbroadcasttargets 
          GROUP BY dbroadcastid
        ) bt ON b.did = bt.dbroadcastid
      `;

      const conditions = [];
      const values = [];
      let paramCount = 0;

      // Add search filter
      if (search?.trim()) {
        paramCount++;
        conditions.push(`(
          LOWER(b.dtitle) LIKE LOWER($${paramCount}) OR 
          LOWER(b.dcontent) LIKE LOWER($${paramCount}) OR 
          LOWER(u.demail) LIKE LOWER($${paramCount})
        )`);
        values.push(`%${search.trim()}%`);
      }

      // Add priority filter
      if (priority && priority !== 'all') {
        paramCount++;
        conditions.push(`b.dpriority = $${paramCount}`);
        values.push(priority);
      }

      // Add status filter
      if (status && status !== 'all') {
        paramCount++;
        conditions.push(`b.dstatus = $${paramCount}`);
        values.push(status);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Add ordering and pagination
      query += ` 
        ORDER BY b.tcreatedat DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      values.push(limit, offset);

      // Execute query
      const result = await this.pool.query(query, values);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM tblbroadcasts b
        LEFT JOIN tblusers u ON b.dcreatedby = u.did
      `;

      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const countResult = await this.pool.query(countQuery, values.slice(0, -2)); // Remove limit and offset
      const total = parseInt(countResult.rows[0].total);

      return {
        broadcasts: result.rows.map(row => this.formatBroadcast(row)),
        total
      };

    } catch (error) {
      console.error('[Broadcast Management Model] Error getting all broadcasts:', error);
      throw error;
    }
  }

  /**
   * Get broadcast by ID
   */
  async getBroadcastById(broadcastId) {
    try {
      const query = `
        SELECT 
          b.did as id,
          b.dtitle as title,
          b.dcontent as content,
          b.dpriority as priority,
          b.dstatus as status,
          b.dreportreason as "reportReason",
          b.dreportedby as "reportedBy",
          b.treportedat as "reportedAt"
        FROM tblbroadcasts b
        WHERE b.did = $1
      `;

      const result = await this.pool.query(query, [broadcastId]);
      
      return result.rows.length > 0 ? this.formatBroadcast(result.rows[0]) : null;

    } catch (error) {
      console.error('[Broadcast Management Model] Error getting broadcast by ID:', error);
      throw error;
    }
  }

  /**
   * Update broadcast status
   */
  async updateBroadcastStatus(broadcastId, newStatus, adminId) {
    try {
      const query = `
        UPDATE tblbroadcasts 
        SET dstatus = $1
        WHERE did = $2
        RETURNING 
          did as id,
          dtitle as title,
          dstatus as status
      `;

      const result = await this.pool.query(query, [newStatus, broadcastId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Broadcast not found');
      }

      // Log the action (you can extend this for audit trail)
      console.log(`[Broadcast Management Model] Broadcast ${broadcastId} status updated to ${newStatus} by admin ${adminId}`);

      return this.formatBroadcast(result.rows[0]);

    } catch (error) {
      console.error('[Broadcast Management Model] Error updating broadcast status:', error);
      throw error;
    }
  }

  /**
   * Restore broadcast (clear report data and/or change status)
   */
  async restoreBroadcast(broadcastId, newStatus, clearReportData, adminId) {
    try {
      let query = `
        UPDATE tblbroadcasts 
        SET dstatus = $1
      `;
      
      let values = [newStatus];
      let paramCount = 1;

      if (clearReportData) {
        query += `, 
          dreportreason = NULL,
          dreportedby = NULL,
          treportedat = NULL
        `;
      }

      paramCount++;
      query += ` WHERE did = $${paramCount}`;
      values.push(broadcastId);

      query += ` RETURNING 
          did as id,
          dtitle as title,
          dstatus as status
      `;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw new NotFoundError('Broadcast not found');
      }

      console.log(`[Broadcast Management Model] Broadcast ${broadcastId} restored by admin ${adminId}`);

      return this.formatBroadcast(result.rows[0]);

    } catch (error) {
      console.error('[Broadcast Management Model] Error restoring broadcast:', error);
      throw error;
    }
  }

  /**
   * Delete broadcast
   */
  async deleteBroadcast(broadcastId, adminId) {
    try {
      // First delete related data
      await this.pool.query('DELETE FROM tblbroadcastacknowledgments WHERE dbroadcastid = $1', [broadcastId]);
      await this.pool.query('DELETE FROM tblbroadcasttargets WHERE dbroadcastid = $1', [broadcastId]);
      
      // Then delete the broadcast
      const result = await this.pool.query('DELETE FROM tblbroadcasts WHERE did = $1', [broadcastId]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Broadcast not found');
      }

      console.log(`[Broadcast Management Model] Broadcast ${broadcastId} deleted by admin ${adminId}`);

    } catch (error) {
      console.error('[Broadcast Management Model] Error deleting broadcast:', error);
      throw error;
    }
  }

  /**
   * Format broadcast data
   */
  formatBroadcast(row) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      priority: row.priority,
      targetRoles: row.targetRoles || [],
      targetOUs: row.targetOUs || [],
      createdByEmail: row.createdByEmail,
      createdAt: row.createdAt,
      scheduledFor: row.scheduledFor,
      sentAt: row.sentAt,
      status: row.status,
      requiresAcknowledgment: row.requiresAcknowledgment,
      acknowledgmentCount: parseInt(row.acknowledgmentCount) || 0,
      totalRecipients: parseInt(row.totalRecipients) || 0,
      eventDate: row.eventDate,
      // Derive isReported from reportReason existence
      isReported: row.reportReason !== null && row.reportReason !== undefined,
      reportReason: row.reportReason,
      reportedBy: row.reportedBy,
      reportedAt: row.reportedAt,
      // Derive isActive from status - broadcasts are active unless archived or deleted
      isActive: row.status !== 'archived' && row.status !== 'deleted'
    };
  }
}

module.exports = BroadcastManagementModel;