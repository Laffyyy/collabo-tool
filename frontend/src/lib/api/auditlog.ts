// API utilities for audit logs

// import { makeAuthenticatedRequest } from './auth'; // Disabled for testing

const API_BASE_URL = '/api';

interface AuditLogResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  category: 'chat' | 'broadcast' | 'user-management' | 'ou-management' | 'global-config' | 'security' | 'system';
  target?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
  priority?: 'low' | 'medium' | 'high';
  userInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

interface AuditLogsData {
  logs: AuditLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  categoryCounts: {
    all: number;
    chat: number;
    broadcast: number;
    'user-management': number;
    'ou-management': number;
    'global-config': number;
  };
}

class AuditLogAPI {
  /**
   * Get audit logs with pagination and filtering
   */
  static async getLogs(params: PaginationParams = {}): Promise<AuditLogsData> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.category) searchParams.append('category', params.category);
    if (params.search) searchParams.append('search', params.search);
    
    const url = `${API_BASE_URL}/auditlogs?${searchParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: AuditLogResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch audit logs');
      }
      
      // Convert timestamp strings to Date objects
      const data = result.data as AuditLogsData;
      data.logs = data.logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
      
      return data;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Get a single audit log by ID
   */
  static async getLogById(id: string): Promise<AuditLog> {
    const url = `${API_BASE_URL}/auditlogs/${id}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: AuditLogResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch audit log');
      }
      
      // Convert timestamp string to Date object
      const log = result.data as AuditLog;
      log.timestamp = new Date(log.timestamp);
      
      return log;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  }
  
  /**
   * Get category counts
   */
  static async getCategoryCounts(): Promise<Record<string, number>> {
    const url = `${API_BASE_URL}/auditlogs/counts`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: AuditLogResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch category counts');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error fetching category counts:', error);
      throw error;
    }
  }
  
  /**
   * Export audit logs
   */
  static async exportLogs(params: { 
    format: 'csv' | 'xlsx'; 
    category?: string; 
    search?: string; 
  }): Promise<Blob> {
    const searchParams = new URLSearchParams();
    
    searchParams.append('format', params.format);
    if (params.category) searchParams.append('category', params.category);
    if (params.search) searchParams.append('search', params.search);
    
    const url = `${API_BASE_URL}/auditlogs/export?${searchParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check if response is JSON (error) or file content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Export failed');
      }
      
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Create a new audit log entry
   */
  static async createLog(logData: {
    userId: string;
    action: string;
    category: string;
    targetType?: string;
    targetId?: string;
    target?: string;
    details: string;
    severity?: string;
    success?: boolean;
    priority?: string;
  }): Promise<any> {
    const url = `${API_BASE_URL}/auditlogs`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: AuditLogResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create audit log');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }
}

export { AuditLogAPI, type AuditLog, type AuditLogsData, type PaginationParams };