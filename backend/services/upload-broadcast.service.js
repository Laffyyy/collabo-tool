const { BadRequestError } = require('../utils/errors');
const { getPool } = require('../config/db');
const UploadBroadcastModel = require('../model/upload-broadcast.model');

// Initialize model with database pool
const pool = getPool();
const uploadBroadcastModel = new UploadBroadcastModel(pool);

/**
 * Create a new broadcast
 * @param {Object} broadcastData - Broadcast data
 * @returns {Promise<Object>} Created broadcast with targets
 */
async function createBroadcast({
  title,
  content,
  priority,
  createdBy,
  targetRoles = [],
  targetOUs = [],
  responseType = 'none',
  requiresAcknowledgment = false,
  scheduledFor = null,
  endDate = null,
  choices = null  // Add choices parameter
}) {
  try {
    console.log(`[Broadcast Service] Creating new broadcast: "${title}" by user ${createdBy}`);
    
    // Validate inputs
    if (!title || !content || !priority || !createdBy) {
      console.log('[Broadcast Service] Missing required fields');
      throw new BadRequestError('Missing required fields');
    }
    
    // Validate choices for 'choices' response type
    if (responseType === 'choices' && (!choices || !Array.isArray(choices) || choices.length === 0)) {
      console.log('[Broadcast Service] Choices required for multiple choice response type');
      throw new BadRequestError('Options are required for multiple choice response type');
    }
    
    // Limit choices to maximum 8 options
    if (responseType === 'choices' && choices.length > 8) {
      console.log('[Broadcast Service] Too many choices provided');
      throw new BadRequestError('Maximum of 8 options allowed for multiple choice');
    }
    
    // Determine if this is a scheduled broadcast
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();
    const status = isScheduled ? 'scheduled' : 'sent';
    
    // Create the broadcast
    const broadcast = await uploadBroadcastModel.createBroadcast({
      title,
      content,
      priority,
      createdBy,
      responseType,
      requiresAcknowledgment,
      status,
      scheduledFor,
      endDate,
      choices: responseType === 'choices' ? choices : null // Only send choices if response type is 'choices'
    });
    
    console.log(`[Broadcast Service] Broadcast created with ID: ${broadcast.id}`);
    
    // Add targets to the broadcast (existing code)
    const targets = [];
    
    // Add role targets
    for (const roleId of targetRoles) {
      // Get role name from database (normally would do a batch query)
      const roles = await uploadBroadcastModel.getRoles();
      const role = roles.find(r => r.id === roleId);
      
      if (role) {
        targets.push({
          type: 'role',
          id: roleId,
          name: role.name
        });
      }
    }
    
    // Add OU targets
    for (const ouId of targetOUs) {
      // Get OU name from database (normally would do a batch query)
      const ous = await uploadBroadcastModel.getOrganizationalUnits();
      const ou = ous.find(o => o.id === ouId);
      
      if (ou) {
        targets.push({
          type: 'ou',
          id: ouId,
          name: ou.name
        });
      }
    }
    
    // Add targets to the broadcast
    const createdTargets = await uploadBroadcastModel.addBroadcastTargets(broadcast.id, targets);
    console.log(`[Broadcast Service] Added ${createdTargets.length} targets to broadcast ${broadcast.id}`);
    
    return {
      ...broadcast,
      targets: createdTargets
    };
  } catch (error) {
    console.error('[Broadcast Service] Error creating broadcast:', error);
    throw error;
  }
}

/**
 * Get available organizational units
 * @returns {Promise<Array>} Array of organizational units
 */
async function getOrganizationalUnits() {
  try {
    return await uploadBroadcastModel.getOrganizationalUnits();
  } catch (error) {
    console.error('[Broadcast Service] Error getting organizational units:', error);
    throw error;
  }
}

/**
 * Get available roles
 * @returns {Promise<Array>} Array of roles
 */
async function getRoles() {
  try {
    return await uploadBroadcastModel.getRoles();
  } catch (error) {
    console.error('[Broadcast Service] Error getting roles:', error);
    throw error;
  }
}

module.exports = {
  createBroadcast,
  getOrganizationalUnits,
  getRoles
};