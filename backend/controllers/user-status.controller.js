const UserStatusService = require('../services/user-status.service');
const { BadRequestError } = require('../utils/errors');

class UserStatusController {
  /**
   * Update user status
   */
  static async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const userId = req.user.id;

      if (!status || !['online', 'away', 'idle', 'offline'].includes(status)) {
        return res.status(400).json({
          message: 'Invalid status. Must be one of: online, away, idle, offline'
        });
      }

      const result = await UserStatusService.updateUserStatus(userId, status);
      
      return res.json({
        success: true,
        user: result
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      return next(error);
    }
  }

  /**
   * Get current user status
   */
  static async getStatus(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await UserStatusService.getUserStatus(userId);
      
      if (!result) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      return res.json(result);
    } catch (error) {
      console.error('Error getting user status:', error);
      return next(error);
    }
  }

  /**
   * Get all users with status
   */
  static async getAllUsersWithStatus(req, res, next) {
    try {
      const users = await UserStatusService.getAllUsersWithStatus();
      
      return res.json(users);
    } catch (error) {
      console.error('Error getting all users with status:', error);
      return next(error);
    }
  }

  /**
   * Update last activity (heartbeat)
   */
  static async heartbeat(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await UserStatusService.updateLastActivity(userId);
      
      return res.json({
        success: true,
        lastActivity: result?.dlastactivity
      });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
      return next(error);
    }
  }

  /**
   * Set user online
   */
  static async setOnline(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await UserStatusService.setUserOnline(userId);
      
      return res.json({
        success: true,
        user: result
      });
    } catch (error) {
      console.error('Error setting user online:', error);
      return next(error);
    }
  }

  /**
   * Set user offline
   */
  static async setOffline(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await UserStatusService.setUserOffline(userId);
      
      return res.json({
        success: true,
        user: result
      });
    } catch (error) {
      console.error('Error setting user offline:', error);
      return next(error);
    }
  }
}

module.exports = UserStatusController;