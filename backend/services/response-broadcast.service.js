const { BadRequestError, NotFoundError } = require('../utils/errors');
const { getPool } = require('../config/db');
const ResponseBroadcastModel = require('../model/response-broadcast.model');
const RetrieveBroadcastModel = require('../model/retrieve-broadcasts.model');

class ResponseBroadcastService {
  constructor() {
    this.responseModel = new ResponseBroadcastModel(getPool());
    this.broadcastModel = new RetrieveBroadcastModel(getPool());
  }

  /**
   * Submit acknowledgment for a broadcast
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created acknowledgment
   */
  async submitAcknowledgment(broadcastId, userId) {
    try {
      // Check if broadcast exists and user hasn't already responded
      const existingResponse = await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
      if (existingResponse) {
        throw new BadRequestError('You have already acknowledged this broadcast');
      }

      const responseData = {
        responseType: 'required',
        acknowledged: true,
        timestamp: new Date().toISOString()
      };

      return await this.responseModel.createBroadcastResponse({
        broadcastId,
        userId,
        responseData
      });
    } catch (error) {
      console.error('Service error in submitAcknowledgment:', error);
      throw error;
    }
  }

  /**
   * Submit preferred date response
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID
   * @param {string} preferredDate - Preferred date
   * @returns {Promise<Object>} Created response
   */
  async submitPreferredDate(broadcastId, userId, preferredDate) {
    try {
      if (!preferredDate) {
        throw new BadRequestError('Preferred date is required');
      }

      // Validate date format
      const date = new Date(preferredDate);
      if (isNaN(date.getTime())) {
        throw new BadRequestError('Invalid date format');
      }

      const existingResponse = await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
      
      const responseData = {
        responseType: 'preferred-date',
        preferredDate: date.toISOString(),
        timestamp: new Date().toISOString()
      };

      if (existingResponse) {
        return await this.responseModel.updateBroadcastResponse(existingResponse.id, responseData);
      } else {
        return await this.responseModel.createBroadcastResponse({
          broadcastId,
          userId,
          responseData
        });
      }
    } catch (error) {
      console.error('Service error in submitPreferredDate:', error);
      throw error;
    }
  }

  /**
   * Submit multiple choice response
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID
   * @param {string} selectedChoice - Selected choice
   * @returns {Promise<Object>} Created response
   */
  async submitChoiceResponse(broadcastId, userId, selectedChoice) {
    try {
      if (!selectedChoice || selectedChoice.trim() === '') {
        throw new BadRequestError('Choice selection is required');
      }

      const existingResponse = await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
      
      const responseData = {
        responseType: 'choices',
        selectedChoice: selectedChoice.trim(),
        timestamp: new Date().toISOString()
      };

      if (existingResponse) {
        return await this.responseModel.updateBroadcastResponse(existingResponse.id, responseData);
      } else {
        return await this.responseModel.createBroadcastResponse({
          broadcastId,
          userId,
          responseData
        });
      }
    } catch (error) {
      console.error('Service error in submitChoiceResponse:', error);
      throw error;
    }
  }

  /**
   * Submit text response
   * @param {string} broadcastId - Broadcast ID
   * @param {string} userId - User ID
   * @param {string} textResponse - Text response
   * @returns {Promise<Object>} Created response
   */
  async submitTextResponse(broadcastId, userId, textResponse) {
    try {
      if (!textResponse || textResponse.trim() === '') {
        throw new BadRequestError('Text response is required');
      }

      if (textResponse.trim().length > 2000) {
        throw new BadRequestError('Text response cannot exceed 2000 characters');
      }

      const existingResponse = await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
      
      const responseData = {
        responseType: 'textbox',
        textResponse: textResponse.trim(),
        timestamp: new Date().toISOString()
      };

      if (existingResponse) {
        return await this.responseModel.updateBroadcastResponse(existingResponse.id, responseData);
      } else {
        return await this.responseModel.createBroadcastResponse({
          broadcastId,
          userId,
          responseData
        });
      }
    } catch (error) {
      console.error('Service error in submitTextResponse:', error);
      throw error;
    }
  }

  // ... rest of the methods remain the same
  async getBroadcastResponses(broadcastId, requesterId) {
    try {
      const broadcast = await this.broadcastModel.getBroadcastById(broadcastId, requesterId);
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found or access denied');
      }

      return await this.responseModel.getResponsesByBroadcastId(broadcastId);
    } catch (error) {
      console.error('Service error in getBroadcastResponses:', error);
      throw error;
    }
  }

  async getUserResponse(broadcastId, userId) {
    try {
      return await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
    } catch (error) {
      console.error('Service error in getUserResponse:', error);
      throw error;
    }
  }

  async getResponseStats(broadcastId, requesterId) {
    try {
      const broadcast = await this.broadcastModel.getBroadcastById(broadcastId, requesterId);
      if (!broadcast) {
        throw new NotFoundError('Broadcast not found or access denied');
      }

      return await this.responseModel.getBroadcastResponseStats(broadcastId);
    } catch (error) {
      console.error('Service error in getResponseStats:', error);
      throw error;
    }
  }

  async deleteUserResponse(broadcastId, userId) {
    try {
      const existingResponse = await this.responseModel.getUserResponseForBroadcast(broadcastId, userId);
      if (!existingResponse) {
        throw new NotFoundError('Response not found');
      }

      return await this.responseModel.deleteBroadcastResponse(existingResponse.id, userId);
    } catch (error) {
      console.error('Service error in deleteUserResponse:', error);
      throw error;
    }
  }
}

module.exports = new ResponseBroadcastService();