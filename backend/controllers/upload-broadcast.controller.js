const broadcastService = require('../services/upload-broadcast.service');

/**
 * Create a new broadcast
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function createBroadcast(req, res, next) {
  try {
    const { 
      title, 
      content, 
      priority, 
      targetRoles, 
      targetOUs, 
      responseType = 'none',
      requiresAcknowledgment = false,
      scheduledFor = null,
      endDate = null,
      choices = null  // Add choices parameter
    } = req.body;
    
    // Get user ID from authenticated session
    const createdBy = req.user.id;
    
    console.log(`[Broadcast Controller] Creating broadcast: "${title}" for targets:`, {
      roles: targetRoles,
      ous: targetOUs,
      scheduledFor,
      endDate,
      responseType,
      choices: responseType === 'choices' ? choices : undefined
    });
    
    const broadcast = await broadcastService.createBroadcast({
      title,
      content,
      priority,
      createdBy,
      targetRoles,
      targetOUs,
      responseType,
      requiresAcknowledgment,
      scheduledFor,
      endDate,
      choices // Pass choices to the service
    });
    
    res.status(201).json({
      ok: true,
      message: 'Broadcast created successfully',
      broadcast
    });
  } catch (err) {
    console.error('[Broadcast Controller] Error:', err);
    next(err);
  }
}

/**
 * Get available organizational units
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getOrganizationalUnits(req, res, next) {
  try {
    const ous = await broadcastService.getOrganizationalUnits();
    
    res.status(200).json({
      ok: true,
      organizationalUnits: ous
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get available roles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getRoles(req, res, next) {
  try {
    const roles = await broadcastService.getRoles();
    
    res.status(200).json({
      ok: true,
      roles
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save a broadcast template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function saveTemplate(req, res, next) {
  try {
    const { 
      name,
      title, 
      content, 
      priority,
      acknowledgmentType = 'none',
      choices = null,
      targetOUs = [],
      targetRoles = []
    } = req.body;
    
    // Get user ID from authenticated session
    const createdBy = req.user.id;
    
    console.log(`[Broadcast Controller] Saving template: "${name}" for user ${createdBy}`);
    
    const template = await broadcastService.saveTemplate({
      name,
      title,
      content,
      priority,
      createdBy,
      acknowledgmentType,
      choices,
      targetOUs,
      targetRoles
    });
    
    res.status(201).json({
      ok: true,
      message: 'Template saved successfully',
      template
    });
  } catch (err) {
    console.error('[Broadcast Controller] Error:', err);
    next(err);
  }
}

/**
 * Get broadcast templates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getTemplates(req, res, next) {
  try {
    // Can filter by user ID if provided in query
    const userId = req.query.userId || req.user.id;
    
    const templates = await broadcastService.getTemplates(userId);
    
    res.status(200).json({
      ok: true,
      templates
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a broadcast template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function deleteTemplate(req, res, next) {
  try {
    const templateId = req.params.id;
    const userId = req.user.id;
    
    if (!templateId) {
      return res.status(400).json({
        ok: false,
        message: 'Template ID is required'
      });
    }
    
    const success = await broadcastService.deleteTemplate(templateId, userId);
    
    if (success) {
      res.status(200).json({
        ok: true,
        message: 'Template deleted successfully'
      });
    } else {
      res.status(404).json({
        ok: false,
        message: 'Template not found or could not be deleted'
      });
    }
  } catch (err) {
    console.error('[Broadcast Controller] Error:', err);
    next(err);
  }
}

// Add to module exports
module.exports = {
  createBroadcast,
  getOrganizationalUnits,
  getRoles,
  saveTemplate,
  getTemplates,
  deleteTemplate
};