const RetrieveBroadcastService = require('../services/retrieve-broadcasts.service');
const { validateRequest } = require('../utils/validate');
const UserRoleModel = require('../model/user-role.model'); 
const { getPool } = require('../config/db');


class RetrieveBroadcastController {
  async getMyBroadcasts(req, res, next) {
    try {
      const userId = req.user.id;
      
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search,
        includeDeleted: req.query.includeDeleted === 'true',
        includeTargets: true // Always include target names
      };

      console.log(`Fetching broadcasts for user ${userId} with filters:`, filters);

      // Use service to get data from database
      const result = await RetrieveBroadcastService.getUserBroadcasts(userId, filters);

      // Format response to match frontend expectations
      res.status(200).json({
        success: true,
        broadcasts: result.broadcasts,
        statistics: result.statistics,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Controller error in getMyBroadcasts:', error);
      next(error);
    }
  }

  async getMyBroadcastById(req, res, next) {
    try {
      const userId = req.user.id;
      const { id: broadcastId } = req.params;

      const broadcast = await RetrieveBroadcastService.getUserBroadcastById(broadcastId, userId);

      res.status(200).json({
        success: true,
        broadcast: broadcast
      });
    } catch (error) {
      console.error('Controller error in getMyBroadcastById:', error);
      next(error);
    }
  }

  async getMyBroadcasts(req, res, next) {
    try {
      const userId = req.user.id;
      
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search,
        includeDeleted: req.query.includeDeleted === 'true',
        includeTargets: true // Add this flag to include target names
      };

      console.log(`Fetching broadcasts for user ${userId} with filters:`, filters);

      // Use service to get data from database
      const result = await RetrieveBroadcastService.getUserBroadcasts(userId, filters);

      // Format response to match frontend expectations
      res.status(200).json({
        success: true,
        broadcasts: result.broadcasts,
        statistics: result.statistics,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Controller error in getMyBroadcasts:', error);
      next(error);
    }
  }

  async createBroadcast(req, res, next) {
    try {
      const { title, content, priority, requiresAcknowledgment, responseType, eventDate } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title and content are required'
        });
      }

      const broadcastData = {
        title,
        content,
        priority: priority || 'medium',
        createdBy: userId,
        requiresAcknowledgment: requiresAcknowledgment || false,
        responseType: responseType || 'none',
        eventDate: eventDate ? new Date(eventDate) : null,
        status: 'draft'
      };

      const newBroadcast = await RetrieveBroadcastService.createBroadcast(broadcastData);

      res.status(201).json({
        success: true,
        broadcast: newBroadcast,
        message: 'Broadcast created successfully'
      });
    } catch (error) {
      console.error('Controller error in createBroadcast:', error);
      next(error);
    }
  }

  async markBroadcastAsDone(req, res, next) {
    try {
      const userId = req.user.id;
      const { id: broadcastId } = req.params;

      const updatedBroadcast = await RetrieveBroadcastService.markBroadcastAsDone(broadcastId, userId);

      res.status(200).json({
        success: true,
        broadcast: updatedBroadcast,
        message: 'Broadcast marked as done'
      });
    } catch (error) {
      console.error('Controller error in markBroadcastAsDone:', error);
      next(error);
    }
  }

  async getReceivedBroadcasts(req, res, next) {
    try {
      const userId = req.user.id;
      const userRoleModel = new UserRoleModel(getPool());
      const userRoles = await userRoleModel.findByUserId(userId);
      console.log('userRoles:', userRoles);

      if (!userRoles || userRoles.length === 0) {
        return res.status(200).json({
          success: true,
          broadcasts: [],
          statistics: { total: 0 },
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 50 }
        });
      }

      // Use camelCase properties
      const { roleId: userRoleId, ouId: userOuId } = userRoles[0] || {};
      console.log('userRoleId:', userRoleId, 'userOuId:', userOuId);

      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        status: req.query.status,
        priority: req.query.priority,
        search: req.query.search
      };

      const result = await RetrieveBroadcastService.getReceivedBroadcasts({
        userRoleId,
        userOuId,
        userId, // Pass userId to filter out user's own broadcasts
        includeTargets: true, // Always include target names
        ...filters
      });

      res.status(200).json({
        success: true,
        broadcasts: result.broadcasts,
        statistics: result.statistics,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Controller error in getReceivedBroadcasts:', error);
      next(error);
    }
  }
  
  /**
   * Get broadcast statistics for current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserBroadcastStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const statistics = await RetrieveBroadcastService.getUserBroadcastStats(userId);
      
      res.status(200).json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Controller error in getUserBroadcastStats:', error);
      next(error);
    }
  }

}

module.exports = new RetrieveBroadcastController();