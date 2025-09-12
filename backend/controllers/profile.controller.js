const ProfileService = require('../services/profile.services');
const { validateRequest } = require('../utils/validate');

class ProfileController {
  /**
   * Get current user profile
   */
  async getUserProfile(req, res, next) {
    try {
      const userId = req.user.id;
      
      const result = await ProfileService.getUserProfile(userId);
      
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
      // Validate request
      const errors = validateRequest(req);
      if (errors.length > 0) {
        return res.status(400).json({
          ok: false,
          errors
        });
      }

      const userId = req.user.id;
      const updateData = req.body;
      
      const result = await ProfileService.updateUserProfile(userId, updateData);
      
      res.status(200).json({
        ok: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Controller error in updateUserProfile:', error);
      next(error);
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