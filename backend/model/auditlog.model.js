const db = require('../config/db');

class AuditLogModel {
  /**
   * Get all audit logs with user information
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.category - Filter by category
   * @param {string} options.search - Search term for filtering
   * @returns {Promise<Array>} Array of audit log records
   */
  static async getAllLogs(options = {}) {
    const { limit = 100, offset = 0, category, search } = options;
    
    let query = `
      SELECT 
        al.did as id,
        al.daction as action,
        al.dtargettype as target_type,
        al.dtargetid as target_id,
        al.ddetails as details,
        al.dipaddress as ip_address,
        al.duseragent as user_agent,
        al.tcreatedat as created_at,
        u.demail as user_email,
        u.dfirstname as user_first_name,
        u.dlastname as user_last_name,
        u.dusername as username
      FROM public.tblauditlogs al
      LEFT JOIN public.tblusers u ON al.duserid = u.did
    `;
    
    const queryParams = [];
    let whereConditions = [];
    let paramIndex = 1;
    
    // Add category filter if provided
    if (category && category !== 'all') {
      // Map frontend category names to database dtargettype values
      let targetType;
      switch (category) {
        case 'chat':
          targetType = 'chat';
          break;
        case 'broadcast':
          targetType = 'broadcast';
          break;
        case 'user-management':
          targetType = 'user';
          break;
        case 'ou-management':
          targetType = 'ou';
          break;
        case 'global-config':
          targetType = 'config';
          break;
        default:
          targetType = category;
      }
      whereConditions.push(`al.dtargettype = $${paramIndex}`);
      queryParams.push(targetType);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(
        al.daction ILIKE $${paramIndex} OR
        al.dtargettype ILIKE $${paramIndex} OR
        al.ddetails::text ILIKE $${paramIndex} OR
        u.demail ILIKE $${paramIndex} OR
        u.dfirstname ILIKE $${paramIndex} OR
        u.dlastname ILIKE $${paramIndex} OR
        u.dusername ILIKE $${paramIndex}
      )`);
      queryParams.push(searchTerm);
      paramIndex++;
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY al.tcreatedat DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    try {
      const result = await db.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Get total count of audit logs
   * @param {Object} options - Query options
   * @param {string} options.category - Filter by category
   * @param {string} options.search - Search term for filtering
   * @returns {Promise<number>} Total count of records
   */
  static async getLogsCount(options = {}) {
    const { category, search } = options;
    
    let query = `
      SELECT COUNT(*) as total
      FROM public.tblauditlogs al
      LEFT JOIN public.tblusers u ON al.duserid = u.did
    `;
    
    const queryParams = [];
    let whereConditions = [];
    let paramIndex = 1;
    
    // Add category filter if provided
    if (category && category !== 'all') {
      // Map frontend category names to database dtargettype values
      let targetType;
      switch (category) {
        case 'chat':
          targetType = 'chat';
          break;
        case 'broadcast':
          targetType = 'broadcast';
          break;
        case 'user-management':
          targetType = 'user';
          break;
        case 'ou-management':
          targetType = 'ou';
          break;
        case 'global-config':
          targetType = 'config';
          break;
        default:
          targetType = category;
      }
      whereConditions.push(`al.dtargettype = $${paramIndex}`);
      queryParams.push(targetType);
      paramIndex++;
    }
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(
        al.daction ILIKE $${paramIndex} OR
        al.dtargettype ILIKE $${paramIndex} OR
        al.ddetails::text ILIKE $${paramIndex} OR
        u.demail ILIKE $${paramIndex} OR
        u.dfirstname ILIKE $${paramIndex} OR
        u.dlastname ILIKE $${paramIndex} OR
        u.dusername ILIKE $${paramIndex}
      )`);
      queryParams.push(searchTerm);
      paramIndex++;
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    try {
      const result = await db.query(query, queryParams);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Error counting audit logs:', error);
      throw error;
    }
  }
  
  /**
   * Get audit log by ID
   * @param {string} id - Audit log ID
   * @returns {Promise<Object|null>} Audit log record or null if not found
   */
  static async getLogById(id) {
    const query = `
      SELECT 
        al.did as id,
        al.daction as action,
        al.dtargettype as target_type,
        al.dtargetid as target_id,
        al.ddetails as details,
        al.dipaddress as ip_address,
        al.duseragent as user_agent,
        al.tcreatedat as created_at,
        u.demail as user_email,
        u.dfirstname as user_first_name,
        u.dlastname as user_last_name,
        u.dusername as username
      FROM public.tblauditlogs al
      LEFT JOIN public.tblusers u ON al.duserid = u.did
      WHERE al.did = $1
    `;
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error fetching audit log by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get category counts for tabs
   * @returns {Promise<Object>} Object with category counts
   */
  static async getCategoryCounts() {
    const query = `
      SELECT 
        al.dtargettype as target_type,
        COUNT(*) as count
      FROM public.tblauditlogs al
      WHERE al.dtargettype IS NOT NULL
      GROUP BY al.dtargettype
    `;
    
    try {
      const result = await db.query(query);
      const counts = {
        all: 0,
        chat: 0,
        broadcast: 0,
        'user-management': 0,
        'ou-management': 0,
        'global-config': 0
      };
      
      // Count total
      const totalQuery = 'SELECT COUNT(*) as total FROM public.tblauditlogs';
      const totalResult = await db.query(totalQuery);
      counts.all = parseInt(totalResult.rows[0].total);
      
      // Map database target types to frontend categories and set counts
      const categoryMapping = {
        'chat': 'chat',
        'broadcast': 'broadcast',
        'user': 'user-management',
        'ou': 'ou-management',
        'config': 'global-config'
      };
      
      result.rows.forEach(row => {
        const category = categoryMapping[row.target_type];
        if (category && counts.hasOwnProperty(category)) {
          counts[category] = parseInt(row.count);
        }
      });
      
      return counts;
    } catch (error) {
      console.error('Error fetching category counts:', error);
      throw error;
    }
  }
  
  /**
   * Create a new audit log entry
   * @param {Object} logData - Audit log data
   * @param {string} logData.userId - User ID who performed the action
   * @param {string} logData.action - Action performed
   * @param {string} logData.targetType - Type of target (optional)
   * @param {string} logData.targetId - ID of target (optional)
   * @param {Object} logData.details - Additional details as JSON
   * @param {string} logData.ipAddress - IP address of the user
   * @param {string} logData.userAgent - User agent string
   * @returns {Promise<Object>} Created audit log record
   */
  static async createLog(logData) {
    const { userId, action, targetType, targetId, details, ipAddress, userAgent } = logData;
    
    const query = `
      INSERT INTO public.tblauditlogs 
      (duserid, daction, dtargettype, dtargetid, ddetails, dipaddress, duseragent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING did as id, tcreatedat as created_at
    `;
    
    try {
      const result = await db.query(query, [
        userId,
        action,
        targetType,
        targetId,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }
}

module.exports = AuditLogModel;
