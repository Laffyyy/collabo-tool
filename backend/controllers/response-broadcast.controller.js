const responseBroadcastService = require('../services/response-broadcast.service');

class ResponseBroadcastController {
  /**
   * Submit acknowledgment for a broadcast
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitAcknowledgment(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const userId = req.user.id;

      const response = await responseBroadcastService.submitAcknowledgment(broadcastId, userId);

      res.status(201).json({
        success: true,
        message: 'Broadcast acknowledged successfully',
        response
      });
    } catch (error) {
      console.error('Controller error in submitAcknowledgment:', error);
      next(error);
    }
  }

  /**
   * Submit preferred date response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitPreferredDate(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const { preferredDate } = req.body;
      const userId = req.user.id;

      const response = await responseBroadcastService.submitPreferredDate(broadcastId, userId, preferredDate);

      res.status(201).json({
        success: true,
        message: 'Preferred date submitted successfully',
        response
      });
    } catch (error) {
      console.error('Controller error in submitPreferredDate:', error);
      next(error);
    }
  }

  /**
   * Submit choice response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitChoiceResponse(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const { selectedChoice } = req.body;
      const userId = req.user.id;

      const response = await responseBroadcastService.submitChoiceResponse(broadcastId, userId, selectedChoice);

      res.status(201).json({
        success: true,
        message: 'Choice response submitted successfully',
        response
      });
    } catch (error) {
      console.error('Controller error in submitChoiceResponse:', error);
      next(error);
    }
  }

  /**
   * Submit text response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async submitTextResponse(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const { textResponse } = req.body;
      const userId = req.user.id;

      const response = await responseBroadcastService.submitTextResponse(broadcastId, userId, textResponse);

      res.status(201).json({
        success: true,
        message: 'Text response submitted successfully',
        response
      });
    } catch (error) {
      console.error('Controller error in submitTextResponse:', error);
      next(error);
    }
  }

  /**
   * Get all responses for a broadcast (admin/creator only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getBroadcastResponses(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const userId = req.user.id;

      const responses = await responseBroadcastService.getBroadcastResponses(broadcastId, userId);

      res.status(200).json({
        success: true,
        responses
      });
    } catch (error) {
      console.error('Controller error in getBroadcastResponses:', error);
      next(error);
    }
  }

  /**
   * Get user's response for a broadcast
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserResponse(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const userId = req.user.id;

      const response = await responseBroadcastService.getUserResponse(broadcastId, userId);

      res.status(200).json({
        success: true,
        response
      });
    } catch (error) {
      console.error('Controller error in getUserResponse:', error);
      next(error);
    }
  }

  /**
   * Get response statistics for a broadcast
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getResponseStats(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const userId = req.user.id;

      const stats = await responseBroadcastService.getResponseStats(broadcastId, userId);

      res.status(200).json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Controller error in getResponseStats:', error);
      next(error);
    }
  }

  /**
   * Delete user's response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteUserResponse(req, res, next) {
    try {
      const { broadcastId } = req.params;
      const userId = req.user.id;

      const success = await responseBroadcastService.deleteUserResponse(broadcastId, userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: 'Response deleted successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Response not found'
        });
      }
    } catch (error) {
      console.error('Controller error in deleteUserResponse:', error);
      next(error);
    }
  }
}

module.exports = new ResponseBroadcastController();