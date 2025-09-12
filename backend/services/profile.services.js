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

      console.log('[Profile Service] Getting profile for userId:', userId);
      const profile = await this.profileModel.getUserProfile(userId);
      console.log('[Profile Service] Raw profile from model:', profile);
      console.log('[Profile Service] Profile photo field:', profile?.profilePhoto);
      console.log('[Profile Service] Cover photo field:', profile?.coverPhoto);
      
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }

      const result = {
        profile,
        success: true
      };
      
      console.log('[Profile Service] Final result:', result);
      return result;
    } catch (error) {
      console.error('Service error in getUserProfile:', error);
      throw error;
    }
  }

  /**
   * Update user profile with photo management
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile data to update
   * @returns {Promise<Object>} Updated profile data
   */
  async updateUserProfile(userId, updateData) {
    try {
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Get current profile to check for existing photos
      const currentProfile = await this.profileModel.getUserProfile(userId);
      if (!currentProfile) {
        throw new NotFoundError('User profile not found');
      }

      // Field mapping from API to database
      const dbFieldMap = {
        firstName: 'dfirstname',
        lastName: 'dlastname',
        onlineStatus: 'donlinestatus',
        profilePhoto: 'dprofilephoto',
        coverPhoto: 'dcoverphoto'
      };

      // Transform API fields to database fields
      const dbUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (dbFieldMap[key] && updateData[key] !== undefined) {
          dbUpdateData[dbFieldMap[key]] = updateData[key];
        }
      });

      if (Object.keys(dbUpdateData).length === 0) {
        throw new BadRequestError('No valid fields provided for update');
      }

      console.log('Service updateUserProfile - userId:', userId);
      console.log('Service updateUserProfile - dbUpdateData:', dbUpdateData);
      console.log('Service updateUserProfile - current profile photos:', {
        profilePhoto: currentProfile.profilePhoto,
        coverPhoto: currentProfile.coverPhoto
      });

      // Store previous photo URLs for potential cleanup
      const previousPhotos = {
        profilePhoto: currentProfile.profilePhoto,
        coverPhoto: currentProfile.coverPhoto
      };

      // Update the profile in database
      const updatedProfile = await this.profileModel.updateUserProfile(userId, dbUpdateData);

      // Log photo update for audit trail
      if (dbUpdateData.dprofilephoto && previousPhotos.profilePhoto !== dbUpdateData.dprofilephoto) {
        console.log(`Profile photo updated for user ${userId}:`, {
          previous: previousPhotos.profilePhoto,
          new: dbUpdateData.dprofilephoto
        });
      }

      if (dbUpdateData.dcoverphoto && previousPhotos.coverPhoto !== dbUpdateData.dcoverphoto) {
        console.log(`Cover photo updated for user ${userId}:`, {
          previous: previousPhotos.coverPhoto,
          new: dbUpdateData.dcoverphoto
        });
      }

      return {
        profile: updatedProfile,
        previousPhotos, // Return for potential cleanup
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

  /**
   * Delete old photo from storage (if needed for cleanup)
   * @param {string} photoUrl - Photo URL to delete
   * @returns {Promise<void>}
   */
  async deleteOldPhoto(photoUrl) {
    try {
      if (!photoUrl || !photoUrl.includes('supabase')) {
        return; // Skip if not a Supabase URL
      }

      console.log('Old photo marked for cleanup:', photoUrl);
      // Note: Actual deletion would require Supabase service key
      // For now, we just log it for manual cleanup or batch processing
    } catch (error) {
      console.error('Error marking photo for deletion:', error);
      // Don't throw - photo cleanup failure shouldn't break profile update
    }
  }
}

module.exports = new ProfileService();