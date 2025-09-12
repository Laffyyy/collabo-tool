class UploadBroadcastModel {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Create a new broadcast
   * @param {Object} broadcastData - Broadcast data
   * @returns {Promise<Object>} Created broadcast
   */
  async createBroadcast({
    title,
    content,
    priority,
    createdBy,
    responseType = 'none',
    requiresAcknowledgment = false,
    status = 'sent',
    scheduledFor = null,
    endDate = null,
    choices = null,
    isRecurring = false,
    recurrencePattern = null,
    recurrenceDays = null,
    recurrenceTimes = null
  }) {
    // Determine sent date based on schedule type
    const now = new Date();
    const sentAt = status === 'sent' ? now : scheduledFor;
    
    const query = `
      INSERT INTO tblbroadcasts (
        dtitle, 
        dcontent, 
        dpriority, 
        dcreatedby, 
        dstatus, 
        drequiresacknowledgment, 
        dresponsetype,
        tscheduledfor,
        tsentat,
        teventdate,
        tenddate,
        dchoices,
        drecurring,
        drecurringtype,
        drecurringdays,
        trecurringtime
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      title,
      content,
      priority,
      createdBy,
      status,
      requiresAcknowledgment,
      responseType,
      scheduledFor,
      sentAt,
      sentAt,
      endDate,
      choices ? JSON.stringify(choices) : null,
      isRecurring,
      recurrencePattern,
      recurrenceDays ? JSON.stringify(recurrenceDays) : null,
      recurrenceTimes ? JSON.stringify(recurrenceTimes) : null
    ];

    const result = await this.pool.query(query, values);
    return this.formatBroadcast(result.rows[0]);
  }

  /**
   * Add targets for a broadcast
   * @param {string} broadcastId - Broadcast ID
   * @param {Array} targets - Array of targets {type, id, name}
   * @returns {Promise<Array>} Created targets
   */
  async addBroadcastTargets(broadcastId, targets) {
    const query = `
      INSERT INTO tblbroadcasttargets (
        dbroadcastid,
        dtargettype,
        dtargetid,
        dtargetname
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const createdTargets = [];

    for (const target of targets) {
      const values = [
        broadcastId,
        target.type,
        target.id,
        target.name
      ];

      const result = await this.pool.query(query, values);
      createdTargets.push(this.formatBroadcastTarget(result.rows[0]));
    }

    return createdTargets;
  }

  /**
   * Get all organizational units for broadcast targeting
   * @returns {Promise<Array>} Array of organizational units
   */
  async getOrganizationalUnits() {
    const query = `
      SELECT did, dname FROM tblorganizationalunits
      ORDER BY dname ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.did,
      name: row.dname
    }));
  }

  /**
   * Get all roles for broadcast targeting
   * @returns {Promise<Array>} Array of roles
   */
  async getRoles() {
    const query = `
      SELECT did, dname FROM tblroles
      ORDER BY dname ASC
    `;

    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      id: row.did,
      name: row.dname
    }));
  }

  /**
   * Format a broadcast from DB row
   * @param {Object} broadcast - Raw broadcast from DB
   * @returns {Object} Formatted broadcast
   */
  formatBroadcast(broadcast) {
    if (!broadcast) return null;
    
    // Parse JSON fields
    let choices = null;
    if (broadcast.dchoices) {
      try {
        choices = JSON.parse(broadcast.dchoices);
      } catch (error) {
        console.error('[Upload Broadcast Model] Error parsing choices JSON:', error);
      }
    }
    
    let recurrenceDays = null;
    if (broadcast.drecurringdays) {
      try {
        recurrenceDays = JSON.parse(broadcast.drecurringdays);
        
        // If this is a monthly recurrence and recurrenceDays is an array with a single number,
        // extract just that number for easier frontend handling
        if (broadcast.drecurringtype === 'monthly' && 
            Array.isArray(recurrenceDays) && 
            recurrenceDays.length === 1 && 
            typeof recurrenceDays[0] === 'number') {
          recurrenceDays = recurrenceDays[0];
        }
      } catch (error) {
        console.error('[Upload Broadcast Model] Error parsing recurring days JSON:', error);
      }
    }
    
    let recurrenceTimes = null;
    if (broadcast.trecurringtime) {
      try {
        recurrenceTimes = JSON.parse(broadcast.trecurringtime);
      } catch (error) {
        console.error('[Upload Broadcast Model] Error parsing recurring times JSON:', error);
      }
    }
    
    return {
      id: broadcast.did,
      title: broadcast.dtitle,
      content: broadcast.dcontent,
      priority: broadcast.dpriority,
      createdBy: broadcast.dcreatedby,
      createdAt: broadcast.tcreatedat,
      scheduledFor: broadcast.tscheduledfor,
      sentAt: broadcast.tsentat,
      eventDate: broadcast.teventdate,
      endDate: broadcast.tenddate,
      status: broadcast.dstatus,
      requiresAcknowledgment: broadcast.drequiresacknowledgment,
      responseType: broadcast.dresponsetype,
      choices: choices,
      isRecurring: broadcast.drecurring || false,
      recurrencePattern: broadcast.drecurringtype,
      recurrenceDays: recurrenceDays,
      recurrenceTimes: recurrenceTimes
    };
  }

  /**
   * Format a broadcast target from DB row
   * @param {Object} target - Raw broadcast target from DB
   * @returns {Object} Formatted broadcast target
   */
  formatBroadcastTarget(target) {
    if (!target) return null;
    
    return {
      id: target.did,
      broadcastId: target.dbroadcastid,
      targetType: target.dtargettype,
      targetId: target.dtargetid,
      targetName: target.dtargetname
    };
  }

  /**
 * Save a broadcast template
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
  async saveTemplate({
    name,
    title,
    content,
    priority,
    createdBy,
    acknowledgmentType = 'none',
    choices = null,
    targetOUs = [], // Add this parameter
    targetRoles = [] // Add this parameter
  }) {
    // Ensure choices is properly JSON-stringified before database insertion
    let processedChoices = null;
    
    if (acknowledgmentType === 'choices' && choices && Array.isArray(choices)) {
      // Make sure we're working with a proper array of strings
      const validChoices = choices.filter(choice => typeof choice === 'string' && choice.trim() !== '');
      if (validChoices.length > 0) {
        // Convert to JSON string with proper double quotes
        processedChoices = JSON.stringify(validChoices);
      }
    }

    // Process target OUs and roles (store names, not IDs)
    let processedTargetOUs = null;
    if (targetOUs && Array.isArray(targetOUs) && targetOUs.length > 0) {
      // Ensure all values are strings and sanitize them
      const validOUs = targetOUs.map(ou => String(ou).trim()).filter(ou => ou !== '');
      if (validOUs.length > 0) {
        processedTargetOUs = JSON.stringify(validOUs);
      }
    }
      
    let processedTargetRoles = null;
    if (targetRoles && Array.isArray(targetRoles) && targetRoles.length > 0) {
      // Ensure all values are strings and sanitize them
      const validRoles = targetRoles.map(role => String(role).trim()).filter(role => role !== '');
      if (validRoles.length > 0) {
        processedTargetRoles = JSON.stringify(validRoles);
      }
    }

    const query = `
      INSERT INTO tblbroadcasttemplates (
        dname,
        dtitle,
        dcontent,
        dpriority,
        dacknowledgmenttype,
        dchoices,
        dcreatedby,
        dtargetou,
        dtargetrole
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      name,
      title,
      content,
      priority,
      acknowledgmentType,
      processedChoices,
      createdBy,
      processedTargetOUs,
      processedTargetRoles
    ];

    const result = await this.pool.query(query, values);
    return this.formatTemplate(result.rows[0]);
  }

  /**
 * Get all templates or templates for a specific user
 * @param {string} userId - User ID to filter templates (optional)
 * @returns {Promise<Array>} Array of templates
 */
async getTemplates(userId = null) {
  try {
    console.log(`[Upload Broadcast Model] getTemplates called with userId: ${userId}`);
    
    // If no userId is provided, return all templates (admin case)
    if (!userId) {
      console.log('[Upload Broadcast Model] No userId provided, returning all templates (admin case)');
      const query = `
        SELECT t.*, CONCAT(u.dfirstname, ' ', u.dlastname) AS dcreatorname
        FROM tblbroadcasttemplates t
        LEFT JOIN tblusers u ON t.dcreatedby = u.did
        ORDER BY t.tcreatedat DESC
      `;
      
      const result = await this.pool.query(query);
      console.log(`[Upload Broadcast Model] Found ${result.rows.length} templates (admin case)`);
      return result.rows.map(row => this.formatTemplate(row));
    }
    
    // Check if user is admin first
    console.log(`[Upload Broadcast Model] Checking if user ${userId} is an admin`);
    const roleQuery = `
      SELECT r.dname 
      FROM tbluserroles ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.duserid = $1 AND LOWER(r.dname) = 'admin'
    `;
    
    const roleResult = await this.pool.query(roleQuery, [userId]);
    console.log(`[Upload Broadcast Model] Admin check result: ${roleResult.rows.length > 0 ? 'Is admin' : 'Not admin'}`);
    
    // If user is admin, return all templates
    if (roleResult.rows.length > 0) {
      console.log('[Upload Broadcast Model] User is admin, returning all templates');
      const allTemplatesQuery = `
        SELECT t.*, CONCAT(u.dfirstname, ' ', u.dlastname) AS dcreatorname 
        FROM tblbroadcasttemplates t
        LEFT JOIN tblusers u ON t.dcreatedby = u.did
        ORDER BY t.tcreatedat DESC
      `;
      
      const result = await this.pool.query(allTemplatesQuery);
      console.log(`[Upload Broadcast Model] Found ${result.rows.length} templates (admin case)`);
      return result.rows.map(row => this.formatTemplate(row));
    }
    
    // For non-admin users, get templates they created AND templates from users in the same OU
    console.log(`[Upload Broadcast Model] Getting templates for non-admin user ${userId}`);
    
    // Get all OUs that the current user belongs to
    const userOusQuery = `
      SELECT douid FROM tbluserroles WHERE duserid = $1
    `;
    const userOusResult = await this.pool.query(userOusQuery, [userId]);
    const userOuIds = userOusResult.rows.map(row => row.douid);
    
    console.log(`[Upload Broadcast Model] User belongs to ${userOuIds.length} OUs:`, userOuIds);
    
    if (userOuIds.length === 0) {
      console.log('[Upload Broadcast Model] User has no OUs, returning only their templates');
      // User has no OUs, just return their own templates
      const ownTemplatesQuery = `
        SELECT t.*, CONCAT(u.dfirstname, ' ', u.dlastname) AS dcreatorname
        FROM tblbroadcasttemplates t
        LEFT JOIN tblusers u ON t.dcreatedby = u.did
        WHERE t.dcreatedby = $1
        ORDER BY t.tcreatedat DESC
      `;
      
      const result = await this.pool.query(ownTemplatesQuery, [userId]);
      console.log(`[Upload Broadcast Model] Found ${result.rows.length} templates created by the user`);
      return result.rows.map(row => this.formatTemplate(row));
    }
    
    // User has OUs, get templates from them and other users in the same OUs
    // First, get all users who share any OU with the current user
    console.log('[Upload Broadcast Model] Getting users who share OUs with current user');
    const sharedOuUsersQuery = `
      SELECT DISTINCT ur.duserid
      FROM tbluserroles ur
      WHERE ur.douid = ANY($1::uuid[])
    `;
    
    const sharedOuUsersResult = await this.pool.query(sharedOuUsersQuery, [userOuIds]);
    const sharedUsers = sharedOuUsersResult.rows.map(row => row.duserid);
    
    console.log(`[Upload Broadcast Model] Found ${sharedUsers.length} users who share OUs with current user`);
    
    // Get templates created by any of these users (including current user)
    const templatesQuery = `
      SELECT t.*, CONCAT(u.dfirstname, ' ', u.dlastname) AS dcreatorname
      FROM tblbroadcasttemplates t
      LEFT JOIN tblusers u ON t.dcreatedby = u.did
      WHERE t.dcreatedby = ANY($1::uuid[])
      ORDER BY t.tcreatedat DESC
    `;
    
    const result = await this.pool.query(templatesQuery, [sharedUsers]);
    console.log(`[Upload Broadcast Model] Found ${result.rows.length} templates accessible to user`);
    
    // Add creator details to the log for debugging
    result.rows.forEach(row => {
      console.log(`[Upload Broadcast Model] Template: ${row.dname}, Creator: ${row.dcreatorname} (${row.dcreatedby})`);
    });
    
    return result.rows.map(row => this.formatTemplate(row));
  } catch (error) {
    console.error('[Upload Broadcast Model] Error fetching templates:', error);
    return [];
  }
}

  /**
   * Format a template from DB row
   * @param {Object} template - Raw template from DB
   * @returns {Object} Formatted template
   */
  formatTemplate(template) {
  if (!template) return null;
  
  let choices = null;
  let targetOUs = [];
  let targetRoles = [];
  
  // Safely parse JSON with error handling
  if (template.dchoices) {
    try {
      choices = JSON.parse(template.dchoices);
    } catch (error) {
      console.error('[Upload Broadcast Model] Error parsing choices JSON:', error);
      choices = null;
    }
  }
  
  if (template.dtargetou) {
    // Check if it's already an array
    if (Array.isArray(template.dtargetou)) {
      targetOUs = template.dtargetou;
    } else if (typeof template.dtargetou === 'string') {
      try {
        // First try to parse as JSON
        targetOUs = JSON.parse(template.dtargetou);
      } catch (error) {
        // If that fails, try to extract the values from the string representation
        try {
          // Handle PostgreSQL array format: [ 'value1', 'value2' ]
          const cleanString = template.dtargetou.replace(/^\[|\]$/g, '').trim();
          if (cleanString) {
            targetOUs = cleanString.split(',').map(item => 
              item.trim().replace(/^'|'$/g, '')
            );
          }
        } catch (innerError) {
          console.error('[Upload Broadcast Model] Failed to extract OU values:', innerError);
          targetOUs = [];
        }
      }
    }
  }
  
  if (template.dtargetrole) {
    // Check if it's already an array
    if (Array.isArray(template.dtargetrole)) {
      targetRoles = template.dtargetrole;
    } else if (typeof template.dtargetrole === 'string') {
      try {
        // First try to parse as JSON
        targetRoles = JSON.parse(template.dtargetrole);
      } catch (error) {
        // If that fails, try to extract the values from the string representation
        try {
          // Handle PostgreSQL array format: [ 'value1', 'value2' ]
          const cleanString = template.dtargetrole.replace(/^\[|\]$/g, '').trim();
          if (cleanString) {
            targetRoles = cleanString.split(',').map(item => 
              item.trim().replace(/^'|'$/g, '')
            );
          }
        } catch (innerError) {
          console.error('[Upload Broadcast Model] Failed to extract role values:', innerError);
          targetRoles = [];
        }
      }
    }
  }
  return {
    id: template.did,
    name: template.dname,
    title: template.dtitle,
    content: template.dcontent,
    priority: template.dpriority,
    acknowledgmentType: template.dacknowledgmenttype,
    choices: choices,
    targetOUs: targetOUs,
    targetRoles: targetRoles,
    createdBy: template.dcreatedby,
    creatorName: template.dcreatorname || 'Unknown User',
    createdAt: template.tcreatedat
  };
}

/**
 * Delete a broadcast template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Success status
 */
async deleteTemplate(templateId) {
  if (!templateId) return false;
  
  const query = `
    DELETE FROM tblbroadcasttemplates
    WHERE did = $1
    RETURNING did
  `;
  
  const result = await this.pool.query(query, [templateId]);
  return result.rowCount > 0;
}
}

module.exports = UploadBroadcastModel;