const ProfileService = require('../services/profile.services');
const { validationResult } = require('express-validator');

class ProfileController {
  /**
   * Get current user profile
   */
  async getUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      console.log('[Profile Controller] Getting profile for userId:', userId);
      
      const result = await ProfileService.getUserProfile(userId);
      console.log('[Profile Controller] Service result:', result);
      console.log('[Profile Controller] Profile photo in result:', result.profile?.profilePhoto);
      console.log('[Profile Controller] Cover photo in result:', result.profile?.coverPhoto);
      
      res.status(200).json({
        ok: true,
        data: result
      });
    } catch (error) {
      console.error('Controller error in getUserProfile:', error);
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  async updateUserProfile(req, res, next) {
    try {
      // Check for validation errors from express-validator middleware
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          ok: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.user.id;
      const updateData = req.body;
      
      console.log('Controller updateUserProfile - userId:', userId);
      console.log('Controller updateUserProfile - updateData:', updateData);
      
      const result = await ProfileService.updateUserProfile(userId, updateData);
      
      res.status(200).json({
        ok: true,
        data: { profile: result.profile },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Controller error in updateUserProfile:', error);
      res.status(500).json({
        ok: false,
        message: error.message || 'Failed to update profile',
        error: error.message
      });
    }
  }

  /**
   * Get user's team structure
   */
  async getUserTeamStructure(req, res, next) {
    try {
      const userId = req.user.id;
      
      const result = await ProfileService.getUserTeamStructure(userId);
      
      res.status(200).json({
        ok: true,
        data: result
      });
    } catch (error) {
      console.error('Controller error in getUserTeamStructure:', error);
      next(error);
    }
  }
}

module.exports = new ProfileController();