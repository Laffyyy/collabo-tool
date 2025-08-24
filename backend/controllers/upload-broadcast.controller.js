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

module.exports = {
  createBroadcast,
  getOrganizationalUnits,
  getRoles
};