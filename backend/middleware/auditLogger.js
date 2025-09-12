const { InsertAuditLog } = require('../services/OUmanagement.service');

/**
 * Audit logging middleware for OU management operations
 * @param {string} action - The action being performed
 * @param {string} targetType - The type of target (e.g., 'OU', 'User', 'Settings')
 * @param {Function} getTargetId - Function to extract target ID from request
 * @param {Function} getDetails - Function to extract additional details from request
 * @returns {Function} Express middleware function
 */
function auditLogger(action, targetType, getTargetId = null, getDetails = null) {
  return async (req, res, next) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override response methods to capture response data
    res.send = function(data) {
      // Log the action after successful response
      logAuditEntry(req, res, action, targetType, getTargetId, getDetails, data);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      // Log the action after successful response
      logAuditEntry(req, res, action, targetType, getTargetId, getDetails, data);
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Log audit entry for OU management operations
 */
async function logAuditEntry(req, res, action, targetType, getTargetId, getDetails, responseData) {
  try {
    // Only log successful operations (status 200-299)
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }
    
    // Extract user information from request
    const userId = req.user?.userId || req.user?.id || null;
    if (!userId) {
      console.warn('Audit log: No user ID found in request');
      return;
    }
    
    // Extract target ID
    let targetId = null;
    if (getTargetId && typeof getTargetId === 'function') {
      targetId = getTargetId(req, responseData);
    } else if (req.params?.id) {
      targetId = req.params.id;
    } else if (req.body?.id) {
      targetId = req.body.id;
    }
    
    // Extract additional details
    let details = {};
    if (getDetails && typeof getDetails === 'function') {
      details = getDetails(req, responseData);
    } else {
      // Default details extraction
      details = {
        method: req.method,
        endpoint: req.originalUrl,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      };
    }
    
    // Add response status to details
    details.responseStatus = res.statusCode;
    
    // Insert audit log
    await InsertAuditLog(
      userId,
      action,
      targetType,
      targetId,
      details,
      req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      req.headers['user-agent'],
      new Date()
    );
    
  } catch (error) {
    // Don't let audit logging errors break the main operation
    console.error('Audit logging error:', error.message);
  }
}

/**
 * Helper functions for extracting target IDs and details
 */
const auditHelpers = {
  // For OU creation
  getCreateOUTargetId: (req, responseData) => {
    return responseData?.data?.did || responseData?.data?.id || null;
  },
  
  getCreateOUDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      ouName: req.body?.OrgName,
      ouDescription: req.body?.Description,
      ouLocation: req.body?.Location,
      parentId: req.body?.ParentId,
      hasSettings: !!req.body?.Settings,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For OU updates
  getUpdateOUTargetId: (req, responseData) => {
    return req.body?.id || req.params?.id || null;
  },
  
  getUpdateOUDetails: (req, responseData) => {
    const changes = req.body?.changes || {};
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      updatedFields: Object.keys(changes),
      hasNameChange: !!changes.OrgName,
      hasDescriptionChange: !!changes.Description,
      hasLocationChange: !!changes.Location,
      hasStatusChange: changes.isactive !== undefined,
      hasSettingsChange: !!changes.Settings,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For OU deactivation
  getDeactivateOUTargetId: (req, responseData) => {
    return req.body?.deativationlist || null;
  },
  
  getDeactivateOUDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      deactivationList: req.body?.deativationlist,
      count: req.body?.deativationlist?.length || 0,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For OU reactivation
  getReactivateOUTargetId: (req, responseData) => {
    return req.body?.reactivationlist || null;
  },
  
  getReactivateOUDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      reactivationList: req.body?.reactivationlist,
      count: req.body?.reactivationlist?.length || 0,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For OU retrieval
  getRetrieveOUDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      queryParams: req.query,
      resultCount: responseData?.data?.length || 0,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For OU settings retrieval
  getOUSettingsTargetId: (req, responseData) => {
    return req.query?.id || req.params?.id || null;
  },
  
  getOUSettingsDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      ouId: req.query?.id || req.params?.id,
      hasSettings: !!responseData?.jsSettings,
      responseStatus: responseData?.ok ? 200 : 500
    };
  },
  
  // For getting children
  getChildrenTargetId: (req, responseData) => {
    return req.query?.parentid || req.params?.parentid || null;
  },
  
  getChildrenDetails: (req, responseData) => {
    return {
      method: req.method,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      parentId: req.query?.parentid || req.params?.parentid,
      childrenCount: responseData?.data?.length || 0,
      responseStatus: responseData?.ok ? 200 : 500
    };
  }
};

module.exports = {
  auditLogger,
  auditHelpers
};
