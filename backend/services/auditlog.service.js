const AuditLogModel = require('../model/auditlog.model');

class AuditLogService {
  /**
   * Get audit logs with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Number of records per page
   * @param {string} options.category - Filter by category
   * @param {string} options.search - Search term
   * @returns {Promise<Object>} Formatted audit logs data
   */
  static async getAuditLogs(options = {}) {
    try {
      const { page = 1, limit = 50, category, search } = options;
      const offset = (page - 1) * limit;
      
      // Get logs and total count in parallel
      const [logs, totalCount, categoryCounts] = await Promise.all([
        AuditLogModel.getAllLogs({ limit, offset, category, search }),
        AuditLogModel.getLogsCount({ category, search }),
        AuditLogModel.getCategoryCounts()
      ]);
      
      // Format the logs
      const formattedLogs = logs.map(log => this.formatAuditLog(log));
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
      
      return {
        logs: formattedLogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage
        },
        categoryCounts
      };
    } catch (error) {
      console.error('Error in getAuditLogs service:', error);
      throw new Error('Failed to fetch audit logs');
    }
  }
  
  /**
   * Get a single audit log by ID
   * @param {string} id - Audit log ID
   * @returns {Promise<Object|null>} Formatted audit log or null
   */
  static async getAuditLogById(id) {
    try {
      const log = await AuditLogModel.getLogById(id);
      return log ? this.formatAuditLog(log) : null;
    } catch (error) {
      console.error('Error in getAuditLogById service:', error);
      throw new Error('Failed to fetch audit log');
    }
  }
  
  /**
   * Create a new audit log entry
   * @param {Object} logData - Audit log data
   * @param {string} logData.userId - User ID who performed the action
   * @param {string} logData.action - Action performed
   * @param {string} logData.category - Category of the action
   * @param {string} logData.targetType - Type of target (optional)
   * @param {string} logData.targetId - ID of target (optional)
   * @param {string} logData.target - Target name/description (optional)
   * @param {string} logData.details - Detailed description
   * @param {string} logData.severity - Severity level
   * @param {boolean} logData.success - Whether the action was successful
   * @param {string} logData.priority - Priority level (for broadcasts)
   * @param {string} logData.ipAddress - IP address of the user
   * @param {string} logData.userAgent - User agent string
   * @returns {Promise<Object>} Created audit log
   */
  static async createAuditLog(logData) {
    try {
      const {
        userId,
        action,
        category,
        targetType,
        targetId,
        target,
        details,
        severity = 'low',
        success = true,
        priority,
        ipAddress,
        userAgent
      } = logData;
      
      // Prepare the details object
      const detailsObj = {
        category,
        target,
        description: details,
        severity,
        success,
        ...(priority && { priority })
      };
      
      const result = await AuditLogModel.createLog({
        userId,
        action,
        targetType,
        targetId,
        details: detailsObj,
        ipAddress,
        userAgent
      });
      
      return result;
    } catch (error) {
      console.error('Error in createAuditLog service:', error);
      throw new Error('Failed to create audit log');
    }
  }
  
  /**
   * Format a raw audit log record from the database
   * @param {Object} rawLog - Raw log data from database
   * @returns {Object} Formatted log data
   */
  static formatAuditLog(rawLog) {
    const details = rawLog.details || {};
    
    // Map database dtargettype to frontend category names
    const categoryMapping = {
      'chat': 'chat',
      'broadcast': 'broadcast',
      'user': 'user-management',
      'ou': 'ou-management',
      'config': 'global-config'
    };
    
    const category = categoryMapping[rawLog.target_type] || rawLog.target_type || 'system';
    
    return {
      id: rawLog.id,
      timestamp: new Date(rawLog.created_at),
      user: rawLog.user_email || `${rawLog.user_first_name} ${rawLog.user_last_name}`.trim() || rawLog.username || 'Unknown User',
      action: rawLog.action,
      category: category,
      target: details.target || rawLog.target_type || null,
      details: details.description || rawLog.action,
      ipAddress: rawLog.ip_address || 'Unknown',
      userAgent: rawLog.user_agent || 'Unknown',
      severity: details.severity || this.inferSeverityFromAction(rawLog.action),
      success: details.success !== undefined ? details.success : true,
      priority: details.priority || null,
      // Additional user info for detailed view
      userInfo: {
        email: rawLog.user_email,
        firstName: rawLog.user_first_name,
        lastName: rawLog.user_last_name,
        username: rawLog.username
      }
    };
  }
  
  /**
   * Infer category from action if not provided
   * @param {string} action - Action string
   * @returns {string} Inferred category
   */
  static inferCategoryFromAction(action) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('chat') || actionLower.includes('message') || actionLower.includes('group')) {
      return 'chat';
    }
    if (actionLower.includes('broadcast') || actionLower.includes('announcement')) {
      return 'broadcast';
    }
    if (actionLower.includes('user') || actionLower.includes('account') || actionLower.includes('role')) {
      return 'user-management';
    }
    if (actionLower.includes('ou') || actionLower.includes('organization') || actionLower.includes('department')) {
      return 'ou-management';
    }
    if (actionLower.includes('config') || actionLower.includes('setting') || actionLower.includes('policy')) {
      return 'global-config';
    }
    if (actionLower.includes('security') || actionLower.includes('auth') || actionLower.includes('login')) {
      return 'security';
    }
    
    return 'system';
  }
  
  /**
   * Infer severity from action if not provided
   * @param {string} action - Action string
   * @returns {string} Inferred severity
   */
  static inferSeverityFromAction(action) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('delete') || actionLower.includes('remove') || 
        actionLower.includes('emergency') || actionLower.includes('critical') ||
        actionLower.includes('security') || actionLower.includes('breach')) {
      return 'high';
    }
    if (actionLower.includes('update') || actionLower.includes('modify') || 
        actionLower.includes('change') || actionLower.includes('edit')) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Get logs for export with all data
   * @param {Object} options - Query options
   * @param {string} options.category - Filter by category
   * @param {string} options.search - Search term
   * @returns {Promise<Object>} Logs grouped by category for export
   */
  static async getLogsForExport(options = {}) {
    try {
      const { category, search } = options;
      
      // Get all logs without pagination for export
      const logs = await AuditLogModel.getAllLogs({ 
        limit: 10000, // Large limit for export
        offset: 0, 
        category, 
        search 
      });
      
      const formattedLogs = logs.map(log => this.formatAuditLog(log));
      
      // Group by category for separate sheets
      const groupedLogs = {
        all: formattedLogs,
        chat: formattedLogs.filter(log => log.category === 'chat'),
        broadcast: formattedLogs.filter(log => log.category === 'broadcast'),
        'user-management': formattedLogs.filter(log => log.category === 'user-management'),
        'ou-management': formattedLogs.filter(log => log.category === 'ou-management'),
        'global-config': formattedLogs.filter(log => log.category === 'global-config'),
        security: formattedLogs.filter(log => log.category === 'security'),
        system: formattedLogs.filter(log => log.category === 'system')
      };
      
      return groupedLogs;
    } catch (error) {
      console.error('Error in getLogsForExport service:', error);
      throw new Error('Failed to fetch logs for export');
    }
  }
}

module.exports = AuditLogService;
