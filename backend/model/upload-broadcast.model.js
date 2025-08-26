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
    choices = null // Add this parameter
  }) {
    // Determine sent date based on schedule type
    const now = new Date();
    // If sending immediately, set sentAt to now. If scheduled, set to scheduledFor
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
        dchoices
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      scheduledFor,    // tscheduledfor - null if immediate, date if scheduled
      sentAt,          // tsentat - NOW() if immediate, scheduledFor if scheduled
      sentAt,          // teventdate - follows same rules as tsentat
      endDate,         // tenddate - optional end date
      choices ? JSON.stringify(choices) : null  // Convert choices array to JSON string
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
      choices: broadcast.dchoices
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
    // If no userId is provided, return all templates (admin case)
    if (!userId) {
      const query = `
        SELECT * FROM tblbroadcasttemplates
        ORDER BY tcreatedat DESC
      `;
      
      const result = await this.pool.query(query);
      return result.rows.map(row => this.formatTemplate(row));
    }
    
    // For users with an OU, get their templates directly instead of calling getTemplatesByOU
    // Check if user is admin first
    const roleQuery = `
      SELECT r.dname 
      FROM tbluserroles ur
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.duserid = $1 AND LOWER(r.dname) = 'admin'
    `;
    
    const roleResult = await this.pool.query(roleQuery, [userId]);
    
    // If user is admin, return all templates
    if (roleResult.rows.length > 0) {
      const allTemplatesQuery = `
        SELECT * FROM tblbroadcasttemplates
        ORDER BY tcreatedat DESC
      `;
      
      const result = await this.pool.query(allTemplatesQuery);
      return result.rows.map(row => this.formatTemplate(row));
    }
    
    // For non-admin users, get templates they created
    const userTemplatesQuery = `
      SELECT t.*
      FROM tblbroadcasttemplates t
      WHERE t.dcreatedby = $1
      ORDER BY t.tcreatedat DESC
    `;
    
    const result = await this.pool.query(userTemplatesQuery, [userId]);
    return result.rows.map(row => this.formatTemplate(row));
  } catch (error) {
    console.error('Error fetching templates:', error);
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