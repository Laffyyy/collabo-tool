const UserStatusModel = require('../model/user-status.model');

class UserStatusService {
  /**
   * Update user status
   */
  static async updateUserStatus(userId, status) {
    try {
      return await UserStatusModel.updateUserStatus(userId, status);
    } catch (error) {
      console.error('Error in updateUserStatus service:', error);
      throw error;
    }
  }

  /**
   * Get user status
   */
  static async getUserStatus(userId) {
    try {
      return await UserStatusModel.getUserStatus(userId);
    } catch (error) {
      console.error('Error in getUserStatus service:', error);
      throw error;
    }
  }

  /**
   * Get all users with their current status
   */
  static async getAllUsersWithStatus() {
    try {
      return await UserStatusModel.getAllUsersWithStatus();
    } catch (error) {
      console.error('Error in getAllUsersWithStatus service:', error);
      throw error;
    }
  }

  /**
   * Update user's last activity (heartbeat)
   */
  static async updateLastActivity(userId) {
    try {
      return await UserStatusModel.updateLastActivity(userId);
    } catch (error) {
      console.error('Error in updateLastActivity service:', error);
      throw error;
    }
  }

  /**
   * Set user online
   */
  static async setUserOnline(userId) {
    try {
      return await UserStatusModel.setUserOnline(userId);
    } catch (error) {
      console.error('Error in setUserOnline service:', error);
      throw error;
    }
  }

  /**
   * Set user offline
   */
  static async setUserOffline(userId) {
    try {
      return await UserStatusModel.setUserOffline(userId);
    } catch (error) {
      console.error('Error in setUserOffline service:', error);
      throw error;
    }
  }

  /**
   * Set user away
   */
  static async setUserAway(userId) {
    try {
      return await UserStatusModel.setUserAway(userId);
    } catch (error) {
      console.error('Error in setUserAway service:', error);
      throw error;
    }
  }

  /**
   * Set user idle
   */
  static async setUserIdle(userId) {
    try {
      return await UserStatusModel.setUserIdle(userId);
    } catch (error) {
      console.error('Error in setUserIdle service:', error);
      throw error;
    }
  }
}

module.exports = UserStatusService;