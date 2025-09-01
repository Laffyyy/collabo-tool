const RetrieveBroadcastModel = require('../model/retrieve-broadcasts.model');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const { getPool } = require('../config/db');

class RetrieveBroadcastService {
  constructor() {
    this.broadcastModel = new RetrieveBroadcastModel(getPool());
  }

  /**
   * Get user's broadcasts with filtering and pagination from database
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Broadcasts and metadata from database
   */
  async getUserBroadcasts(userId, filters = {}) {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    const {
      page = 1,
      limit = 50,
      status,
      priority,
      search,
      includeDeleted = false,
      includeTargets = false
    } = filters;

    const offset = (page - 1) * limit;

    try {
      // Get broadcasts from database
      const broadcasts = await this.broadcastModel.getBroadcastsByUser(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
        priority,
        includeDeleted
      });

      // Apply search filter if needed
      let filteredBroadcasts = broadcasts;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredBroadcasts = broadcasts.filter(broadcast => 
          broadcast.title.toLowerCase().includes(searchTerm) ||
          broadcast.content.toLowerCase().includes(searchTerm)
        );
      }
      
      // Get statistics including acknowledgment counts
      const stats = await this.broadcastModel.getBroadcastStatsByUser(userId);
      
      // Merge acknowledgment counts with broadcasts
      if (stats.broadcastAcknowledgments) {
        filteredBroadcasts.forEach(broadcast => {
          const ackCount = stats.broadcastAcknowledgments[broadcast.id] || 0;
          broadcast.acknowledgments = Array(ackCount).fill({ 
            userId: '', 
            acknowledgedAt: new Date() 
          });
        });
      }
      
      // Get targets if requested
      if (includeTargets && filteredBroadcasts.length > 0) {
        await this.broadcastModel.attachTargetsToManyBroadcasts(filteredBroadcasts);
      }

      return {
        broadcasts: filteredBroadcasts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(stats.total / limit),
          totalItems: stats.total,
          itemsPerPage: parseInt(limit)
        },
        statistics: stats,
        filters: {
          status,
          priority,
          search
        }
      };
    } catch (error) {
      console.error('Service error in getUserBroadcasts:', error);
      throw new Error(`Failed to retrieve user broadcasts: ${error.message}`);
    }
  }

  /**
   * Get specific broadcast by ID
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID for ownership verification
   * @returns {Promise<Object>} Broadcast object
   */
  async getUserBroadcastById(broadcastId, userId) {
    try {
      const broadcast = await this.broadcastModel.getBroadcastById(broadcastId, userId);
      
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found');
      }

      return broadcast;
    } catch (error) {
      console.error('Service error in getUserBroadcastById:', error);
      throw error;
    }
  }

  /**
   * Get broadcast statistics for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Statistics object
   */
  async getUserBroadcastStats(userId) {
    try {
      return await this.broadcastModel.getBroadcastStatsByUser(userId);
    } catch (error) {
      console.error('Service error in getUserBroadcastStats:', error);
      throw new Error(`Failed to retrieve broadcast statistics: ${error.message}`);
    }
  }

  /**
   * Create new broadcast
   * @param {Object} broadcastData - Broadcast data
   * @returns {Promise<Object>} Created broadcast
   */
  async createBroadcast(broadcastData) {
    try {
      return await this.broadcastModel.createBroadcast(broadcastData);
    } catch (error) {
      console.error('Service error in createBroadcast:', error);
      throw new Error(`Failed to create broadcast: ${error.message}`);
    }
  }

  /**
   * Mark a broadcast as done
   * @param {string} broadcastId
   * @param {string} userId
   * @returns {Promise<Object>} Updated broadcast
   */
  async markBroadcastAsDone(broadcastId, userId) {
    try {
      return await this.broadcastModel.updateBroadcastStatus(broadcastId, userId, 'done');
    } catch (error) {
      console.error('Service error in markBroadcastAsDone:', error);
      throw new Error(`Failed to mark broadcast as done: ${error.message}`);
    }
  }

  async getReceivedBroadcasts({ userRoleId, userOuId, userId, page = 1, limit = 50, status, priority, search, includeTargets }) {
    const offset = (page - 1) * limit;

    try {
      const broadcasts = await this.broadcastModel.getReceivedBroadcasts({
        userRoleId,
        userOuId,
        userId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
        priority,
        includeTargets // Pass this flag down
      });

      let filteredBroadcasts = broadcasts;
      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        filteredBroadcasts = broadcasts.filter(broadcast =>
          broadcast.title.toLowerCase().includes(searchTerm) ||
          broadcast.content.toLowerCase().includes(searchTerm)
        );
      }

      const stats = { total: filteredBroadcasts.length };

      return {
        broadcasts: filteredBroadcasts,
        statistics: stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalItems: filteredBroadcasts.length,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Service error in getReceivedBroadcasts:', error);
      throw new Error(`Failed to retrieve received broadcasts: ${error.message}`);
    }
  }

  /**
   * Get all broadcasts (admin)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Broadcasts and metadata
   */
  async getAllBroadcasts(filters = {}) {
  const {
    page = 1,
    limit = 50,
    status,
    priority,
    search,
    includeDeleted = false
  } = filters;

  const offset = (page - 1) * limit;

  try {
    // Get all broadcasts from database
    const broadcasts = await this.broadcastModel.getAllBroadcasts({
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      priority,
      includeDeleted
    });

    // Batch recipient and acknowledgment count queries for all broadcasts
    const broadcastIds = broadcasts.map(b => b.id);
    const recipientCounts = await this.broadcastModel.getRecipientCounts(broadcastIds);
    const acknowledgmentCounts = await this.broadcastModel.getAcknowledgmentCounts(broadcastIds);

    // Attach counts to each broadcast
    for (const broadcast of broadcasts) {
      broadcast.totalRecipients = recipientCounts[broadcast.id] || 0;
      broadcast.acknowledgmentCount = acknowledgmentCounts[broadcast.id] || 0;
    }

    // Apply search filter (in-memory for now)
    let filteredBroadcasts = broadcasts;
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredBroadcasts = broadcasts.filter(broadcast =>
        broadcast.title.toLowerCase().includes(searchTerm) ||
        broadcast.content.toLowerCase().includes(searchTerm)
      );
    }

    // Pagination info (for now, just use filtered count)
    const totalItems = filteredBroadcasts.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Statistics (optional, can be expanded)
    const statistics = {
      total: totalItems
    };

    return {
      broadcasts: filteredBroadcasts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit)
      },
      statistics,
      filters: {
        status,
        priority,
        search
      }
    };
  } catch (error) {
    console.error('Service error in getAllBroadcasts:', error);
    throw new Error(`Failed to retrieve all broadcasts: ${error.message}`);
  }
}

}

module.exports = new RetrieveBroadcastService();