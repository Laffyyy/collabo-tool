const RetrieveBroadcastService = require('../services/retrieve-broadcasts.service');
const { validateRequest } = require('../utils/validate');

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
        includeDeleted: req.query.includeDeleted === 'true'
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

  async getMyBroadcastStats(req, res, next) {
    try {
      const userId = req.user.id;
      
      const stats = await RetrieveBroadcastService.getUserBroadcastStats(userId);

      res.status(200).json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Controller error in getMyBroadcastStats:', error);
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
  
}

module.exports = new RetrieveBroadcastController();