const BroadcastManagementModel = require('../model/broadcast-management.model');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const { getPool } = require('../config/db');

class BroadcastManagementService {
  constructor() {
    this.model = new BroadcastManagementModel(getPool());
  }

  /**
   * Get all broadcasts for admin management
   */
  async getAllBroadcasts(filters = {}) {
    try {
      const { page = 1, limit = 50, search, priority, status } = filters;
      
      const offset = (page - 1) * limit;
      
      const result = await this.model.getAllBroadcasts({
        limit,
        offset,
        search,
        priority,
        status
      });

      return {
        broadcasts: result.broadcasts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          totalItems: result.total,
          itemsPerPage: limit
        }
      };

    } catch (error) {
      console.error('[Broadcast Management Service] Error getting all broadcasts:', error);
      throw error;
    }
  }

  /**
   * Archive a broadcast
   */
  async archiveBroadcast(broadcastId, adminId) {
    try {
      // Check if broadcast exists
      const broadcast = await this.model.getBroadcastById(broadcastId);
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found');
      }

      // Check if broadcast is already archived
      if (broadcast.status === 'archived') {
        throw new BadRequestError('Broadcast is already archived');
      }

      // Archive the broadcast
      const archivedBroadcast = await this.model.updateBroadcastStatus(
        broadcastId, 
        'archived',
        adminId
      );

      console.log(`[Broadcast Management Service] Broadcast ${broadcastId} archived by admin ${adminId}`);
      
      return archivedBroadcast;

    } catch (error) {
      console.error('[Broadcast Management Service] Error archiving broadcast:', error);
      throw error;
    }
  }

  /**
   * Restore a broadcast (from archived or reported status)
   */
  async restoreBroadcast(broadcastId, adminId) {
    try {
      // Check if broadcast exists
      const broadcast = await this.model.getBroadcastById(broadcastId);
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found');
      }

      // Determine the restore action
      let newStatus = 'sent';
      let clearReportData = false;

      if (broadcast.status === 'archived') {
        newStatus = 'sent';
      } else if (broadcast.isReported) {
        newStatus = broadcast.status; // Keep original status
        clearReportData = true;
      } else {
        throw new BadRequestError('Broadcast cannot be restored from its current state');
      }

      // Restore the broadcast
      const restoredBroadcast = await this.model.restoreBroadcast(
        broadcastId,
        newStatus,
        clearReportData,
        adminId
      );

      console.log(`[Broadcast Management Service] Broadcast ${broadcastId} restored by admin ${adminId}`);
      
      return restoredBroadcast;

    } catch (error) {
      console.error('[Broadcast Management Service] Error restoring broadcast:', error);
      throw error;
    }
  }

  /**
   * Delete a broadcast
   */
  async deleteBroadcast(broadcastId, adminId) {
    try {
      // Check if broadcast exists
      const broadcast = await this.model.getBroadcastById(broadcastId);
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found');
      }

      // Delete the broadcast
      await this.model.deleteBroadcast(broadcastId, adminId);

      console.log(`[Broadcast Management Service] Broadcast ${broadcastId} deleted by admin ${adminId}`);

    } catch (error) {
      console.error('[Broadcast Management Service] Error deleting broadcast:', error);
      throw error;
    }
  }
}

module.exports = new BroadcastManagementService();