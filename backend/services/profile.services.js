const ProfileModel = require('../model/profile.model');
const { getPool } = require('../config/db');
const { NotFoundError, BadRequestError } = require('../utils/errors');

class ProfileService {
  constructor() {
    this.profileModel = new ProfileModel(getPool());
  }

  /**
   * Get user profile with complete information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User profile data
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const profile = await this.profileModel.getUserProfile(userId);
      
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      return {
        profile,
        success: true
      };
    } catch (error) {
      console.error('Service error in getUserProfile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile data to update
   * @returns {Promise<Object>} Updated profile data
   */
  async updateUserProfile(userId, updateData) {
    try {
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Validate update data
      const allowedFields = ['firstName', 'lastName', 'onlineStatus', 'profilePhoto'];
      const validatedData = {};

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          // Map frontend field names to database field names
          const dbFieldMap = {
            firstName: 'dfirstname',
            lastName: 'dlastname',
            onlineStatus: 'donlinestatus',
            profilePhoto: 'dprofilephoto'
          };
          validatedData[dbFieldMap[key]] = updateData[key];
        }
      });

      if (Object.keys(validatedData).length === 0) {
        throw new BadRequestError('No valid fields provided for update');
      }

      const updatedProfile = await this.profileModel.updateUserProfile(userId, validatedData);

      return {
        profile: updatedProfile,
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Service error in updateUserProfile:', error);
      throw error;
    }
  }

  /**
   * Get user's team structure
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Team structure data
   */
  async getUserTeamStructure(userId) {
    try {
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      const teamStructure = await this.profileModel.getUserTeamStructure(userId);
      
      if (!teamStructure) {
        throw new NotFoundError('Team structure not found');
      }

      return {
        teamStructure,
        success: true
      };
    } catch (error) {
      console.error('Service error in getUserTeamStructure:', error);
      throw error;
    }
  }
}

module.exports = new ProfileService();