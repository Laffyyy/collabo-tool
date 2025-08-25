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

/**
 * Save a broadcast template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
async function saveTemplate({
  name,
  title,
  content,
  priority,
  createdBy,
  acknowledgmentType = 'none',
  choices = null,
  targetOUs = [],
  targetRoles = []
}) {
  try {
    console.log(`[Broadcast Service] Saving template: "${name}" by user ${createdBy}`);
    
    // Validate inputs
    if (!name || !title || !content || !priority || !createdBy) {
      console.log('[Broadcast Service] Missing required template fields');
      throw new BadRequestError('Template name, title, content, priority, and user ID are required');
    }
    
    // Validate choices for 'choices' response type
    if (acknowledgmentType === 'choices' && (!choices || !Array.isArray(choices) || choices.length === 0)) {
      console.log('[Broadcast Service] Choices required for multiple choice template');
      throw new BadRequestError('Options are required for multiple choice template');
    }
    
    // Limit choices to maximum 8 options
    if (acknowledgmentType === 'choices' && choices.length > 8) {
      console.log('[Broadcast Service] Too many choices provided for template');
      throw new BadRequestError('Maximum of 8 options allowed for multiple choice template');
    }
    
    // Get OU and role names if IDs are provided
    let ouNames = [];
    let roleNames = [];
    
    if (targetOUs.length > 0) {
      const allOUs = await uploadBroadcastModel.getOrganizationalUnits();
      ouNames = targetOUs.map(ouId => {
        const ou = allOUs.find(o => o.id === ouId);
        return ou ? ou.name : null;
      }).filter(name => name !== null);
    }
    
    if (targetRoles.length > 0) {
      const allRoles = await uploadBroadcastModel.getRoles();
      roleNames = targetRoles.map(roleId => {
        const role = allRoles.find(r => r.id === roleId);
        return role ? role.name : null;
      }).filter(name => name !== null);
    }
    
    const template = await uploadBroadcastModel.saveTemplate({
      name,
      title,
      content,
      priority,
      createdBy,
      acknowledgmentType,
      choices: acknowledgmentType === 'choices' ? choices : null,
      targetOUs: ouNames,
      targetRoles: roleNames
    });
    
    console.log(`[Broadcast Service] Template saved with ID: ${template.id}`);
    
    return template;
  } catch (error) {
    console.error('[Broadcast Service] Error saving template:', error);
    throw error;
  }
}

  /**
   * Get broadcast templates for users in the same OU
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of templates
   */
  async function getTemplates(userId) {
    try {
      if (!userId) {
        throw new BadRequestError('User ID is required');
      }
      
      // First get the user's OU from the database
      const query = `SELECT douid FROM tblusers WHERE did = $1`;
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new BadRequestError('User not found');
      }
      
      const userOU = result.rows[0].douid;
      
      // If the user is not assigned to any OU (admin users), return all templates
      if (!userOU) {
        return await uploadBroadcastModel.getTemplates();
      }
      
      // Get templates from users in the same OU
      return await uploadBroadcastModel.getTemplatesByOU(userOU);
    } catch (error) {
      console.error('[Broadcast Service] Error getting templates:', error);
      throw error;
    }
  }

/**
 * Delete a broadcast template
 * @param {string} templateId - Template ID
 * @param {string} userId - User ID (for permission checking)
 * @returns {Promise<boolean>} Success status
 */
async function deleteTemplate(templateId, userId) {
  try {
    if (!templateId || !userId) {
      throw new BadRequestError('Template ID and user ID are required');
    }
    
    // First check if template exists and belongs to the user
    const templates = await uploadBroadcastModel.getTemplates(userId);
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new BadRequestError('Template not found or you do not have permission to delete it');
    }
    
    // Delete the template
    return await uploadBroadcastModel.deleteTemplate(templateId);
  } catch (error) {
    console.error('[Broadcast Service] Error deleting template:', error);
    throw error;
  }
}
module.exports = {
  createBroadcast,
  getOrganizationalUnits,
  getRoles,
  saveTemplate,
  getTemplates,
  deleteTemplate
};