const AuditLogService = require('../services/auditlog.service');
const { validationResult } = require('express-validator');

class AuditLogController {
  /**
   * Get audit logs with pagination and filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getLogs(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const {
        page = 1,
        limit = 50,
        category,
        search
      } = req.query;
      
      // Convert page and limit to numbers
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      // Validate pagination parameters
      if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }
      
      const options = {
        page: pageNum,
        limit: limitNum,
        ...(category && { category }),
        ...(search && { search })
      };
      
      const result = await AuditLogService.getAuditLogs(options);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Audit logs retrieved successfully'
      });
      
    } catch (error) {
      console.error('Error in getLogs controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get a single audit log by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getLogById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Log ID is required'
        });
      }
      
      const log = await AuditLogService.getAuditLogById(id);
      
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: log,
        message: 'Audit log retrieved successfully'
      });
      
    } catch (error) {
      console.error('Error in getLogById controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Create a new audit log entry
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createLog(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const {
        userId,
        action,
        category,
        targetType,
        targetId,
        target,
        details,
        severity,
        success,
        priority
      } = req.body;
      
      // Get IP address and user agent from request
      const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      
      const logData = {
        userId,
        action,
        category,
        targetType,
        targetId,
        target,
        details,
        severity,
        success,
        priority,
        ipAddress,
        userAgent
      };
      
      const result = await AuditLogService.createAuditLog(logData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Audit log created successfully'
      });
      
    } catch (error) {
      console.error('Error in createLog controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while creating audit log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get logs for export (CSV/XLSX)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getLogsForExport(req, res) {
    try {
      const { category, search, format = 'csv' } = req.query;
      
      const options = {
        ...(category && { category }),
        ...(search && { search })
      };
      
      const groupedLogs = await AuditLogService.getLogsForExport(options);
      
      if (format === 'csv') {
        return this.exportAsCSV(res, groupedLogs, category);
      } else if (format === 'xlsx') {
        return this.exportAsXLSX(res, groupedLogs, category);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid export format. Supported formats: csv, xlsx'
        });
      }
      
    } catch (error) {
      console.error('Error in getLogsForExport controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while exporting audit logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Export logs as CSV
   * @param {Object} res - Express response object
   * @param {Object} groupedLogs - Logs grouped by category
   * @param {string} category - Selected category filter
   */
  static exportAsCSV(res, groupedLogs, category) {
    const logsToExport = category && category !== 'all' ? groupedLogs[category] || [] : groupedLogs.all;
    
    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Action',
      'Category',
      'Target',
      'Details',
      'IP Address',
      'User Agent',
      'Severity',
      'Success',
      'Priority'
    ];
    
    // Convert logs to CSV format
    const csvRows = [headers.join(',')];
    
    logsToExport.forEach(log => {
      const row = [
        log.id,
        log.timestamp.toISOString(),
        `"${log.user.replace(/"/g, '""')}"`, // Escape quotes in user field
        `"${log.action.replace(/"/g, '""')}"`,
        log.category,
        log.target ? `"${log.target.replace(/"/g, '""')}"` : '',
        `"${log.details.replace(/"/g, '""')}"`,
        log.ipAddress,
        `"${log.userAgent.replace(/"/g, '""')}"`,
        log.severity,
        log.success,
        log.priority || ''
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const filename = `audit-logs-${category || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }
  
  /**
   * Export logs as XLSX (placeholder for now - requires xlsx library)
   * @param {Object} res - Express response object
   * @param {Object} groupedLogs - Logs grouped by category
   * @param {string} category - Selected category filter
   */
  static exportAsXLSX(res, groupedLogs, category) {
    // For now, return a message that XLSX export needs additional setup
    // In a production environment, you would use a library like 'xlsx' or 'exceljs'
    res.status(501).json({
      success: false,
      message: 'XLSX export not yet implemented. Please use CSV format.',
      note: 'To implement XLSX export, install and configure the xlsx or exceljs library'
    });
  }
  
  /**
   * Get category counts for dashboard tabs
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCategoryCounts(req, res) {
    try {
      const counts = await AuditLogService.getCategoryCounts();
      
      res.status(200).json({
        success: true,
        data: counts,
        message: 'Category counts retrieved successfully'
      });
      
    } catch (error) {
      console.error('Error in getCategoryCounts controller:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching category counts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = AuditLogController;
