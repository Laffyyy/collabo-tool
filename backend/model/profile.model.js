const { getPool } = require('../config/db');

class ProfileModel {
  constructor(pool) {
    this.pool = pool || getPool();
  }

  /**
   * Get complete user profile with hierarchy information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete user profile
   */
  async getUserProfile(userId) {
    try {
        const query = `
        SELECT 
            u.*,
            ur.douid,
            ur.droleid,
            ur.dmanagerid,
            ur.dsupervisorid,
            supervisor.dfirstname || ' ' || supervisor.dlastname as supervisor_name,
            manager.dfirstname || ' ' || manager.dlastname as manager_name,
            ou.dname as ou_name,
            r.dname as role_name
        FROM tblusers u
        LEFT JOIN tbluserroles ur ON u.did = ur.duserid
        LEFT JOIN tblusers supervisor ON ur.dsupervisorid = supervisor.did
        LEFT JOIN tblusers manager ON ur.dmanagerid = manager.did  
        LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
        LEFT JOIN tblroles r ON ur.droleid = r.did
        WHERE u.did = $1 AND u.daccountstatus != 'deleted'
        `;
        
        const result = await this.pool.query(query, [userId]);
        
        if (result.rows.length === 0) {
        return null;
        }
        
        return this.formatUserProfile(result.rows[0]);
    } catch (error) {
        console.error('Database error in getUserProfile:', error);
        throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
    }

  /**
   * Update user profile information
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = ['dfirstname', 'dlastname', 'donlinestatus', 'dprofilephoto'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(userId); // Add userId for WHERE clause
      
      const query = `
        UPDATE tblusers 
        SET ${updates.join(', ')}, tupdatedat = CURRENT_TIMESTAMP
        WHERE did = $${paramIndex} AND daccountstatus != 'deleted'
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('User not found or update failed');
      }

      // Get the updated profile with hierarchy info
      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Database error in updateUserProfile:', error);
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  /**
   * Get user's team structure based on their role
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Team structure
   */
  async getUserTeamStructure(userId) {
    try {
      // First get the user's role and organizational info from tbluserroles
      const userQuery = `
        SELECT ur.droleid, ur.douid, ur.dsupervisorid, ur.dmanagerid, r.dname as role_name
        FROM tbluserroles ur
        LEFT JOIN tblroles r ON ur.droleid = r.did
        WHERE ur.duserid = $1
      `;
      
      const userResult = await this.pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      const role = user.role_name?.toLowerCase() || 'unknown';

      let teamStructure = { type: role };

      switch (role) {
        case 'manager':
          // Get supervisors and team members under this manager
          teamStructure = await this.getManagerTeamStructure(userId, user.douid);
          break;
          
        case 'supervisor':
          // Get team members under this supervisor and their manager
          teamStructure = await this.getSupervisorTeamStructure(userId, user.dmanagerid);
          break;
          
        case 'frontline':
        case 'support':
          // Get supervisor and manager info
          teamStructure = await this.getTeamMemberStructure(user.dsupervisorid, user.dmanagerid);
          break;
          
        default:
          teamStructure = { type: role, message: 'No team structure available for this role' };
      }

      return teamStructure;
    } catch (error) {
      console.error('Database error in getUserTeamStructure:', error);
      throw new Error(`Failed to fetch team structure: ${error.message}`);
    }
  }

  /**
   * Get manager's team structure
   */
  async getManagerTeamStructure(managerId, ouId) {
    const supervisorsQuery = `
      SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name
      FROM tblusers u
      JOIN tbluserroles ur ON u.did = ur.duserid
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.dmanagerid = $1 AND r.dname = 'supervisor' AND u.daccountstatus != 'deleted'
      ORDER BY u.dfirstname, u.dlastname
    `;

    const teamMembersQuery = `
      SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name, ur.dsupervisorid
      FROM tblusers u
      JOIN tbluserroles ur ON u.did = ur.duserid
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.dmanagerid = $1 AND r.dname IN ('frontline', 'support') AND u.daccountstatus != 'deleted'
      ORDER BY u.dfirstname, u.dlastname
    `;

    const [supervisorsResult, teamMembersResult] = await Promise.all([
      this.pool.query(supervisorsQuery, [managerId]),
      this.pool.query(teamMembersQuery, [managerId])
    ]);

    return {
      type: 'manager',
      supervisors: supervisorsResult.rows.map(this.formatTeamMember),
      teamMembers: teamMembersResult.rows.map(this.formatTeamMember)
    };
  }

  /**
   * Get supervisor's team structure
   */
  async getSupervisorTeamStructure(supervisorId, managerId) {
    const teamMembersQuery = `
      SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name
      FROM tblusers u
      JOIN tbluserroles ur ON u.did = ur.duserid
      JOIN tblroles r ON ur.droleid = r.did
      WHERE ur.dsupervisorid = $1 AND r.dname IN ('frontline', 'support') AND u.daccountstatus != 'deleted'
      ORDER BY u.dfirstname, u.dlastname
    `;

    const managerQuery = `
      SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name
      FROM tblusers u
      JOIN tbluserroles ur ON u.did = ur.duserid
      JOIN tblroles r ON ur.droleid = r.did
      WHERE u.did = $1 AND u.daccountstatus != 'deleted'
    `;

    const [teamMembersResult, managerResult] = await Promise.all([
      this.pool.query(teamMembersQuery, [supervisorId]),
      managerId ? this.pool.query(managerQuery, [managerId]) : Promise.resolve({ rows: [] })
    ]);

    return {
      type: 'supervisor',
      manager: managerResult.rows.length > 0 ? this.formatTeamMember(managerResult.rows[0]) : null,
      teamMembers: teamMembersResult.rows.map(this.formatTeamMember)
    };
  }

  /**
   * Get team member's hierarchy
   */
  async getTeamMemberStructure(supervisorId, managerId) {
    const queries = [];
    const params = [];

    if (supervisorId) {
      queries.push(`
        SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name
        FROM tblusers u
        JOIN tbluserroles ur ON u.did = ur.duserid
        JOIN tblroles r ON ur.droleid = r.did
        WHERE u.did = $1 AND u.daccountstatus != 'deleted'
      `);
      params.push(supervisorId);
    }

    if (managerId) {
      queries.push(`
        SELECT u.did, u.dfirstname, u.dlastname, u.demail, r.dname as role_name
        FROM tblusers u
        JOIN tbluserroles ur ON u.did = ur.duserid
        JOIN tblroles r ON ur.droleid = r.did
        WHERE u.did = $${queries.length + 1} AND u.daccountstatus != 'deleted'
      `);
      params.push(managerId);
    }

    const results = await Promise.all(
      queries.map((query, index) => 
        this.pool.query(query, [params[index]])
      )
    );

    return {
      type: 'team_member',
      supervisor: supervisorId && results[0]?.rows.length > 0 ? this.formatTeamMember(results[0].rows[0]) : null,
      manager: managerId && results[queries.length > 1 ? 1 : 0]?.rows.length > 0 ? 
        this.formatTeamMember(results[queries.length > 1 ? 1 : 0].rows[0]) : null
    };
  }

  /**
   * Format user profile data
   */
    formatUserProfile(user) {
    if (!user) return null;
    
    return {
        id: user.did,
        employeeId: user.demployeeid,
        username: user.dusername,
        email: user.demail, // This should map to the email field correctly
        firstName: user.dfirstname,
        lastName: user.dlastname,
        role: user.role_name || user.drole, // Use role name from join or fallback to drole
        organizationUnit: user.ou_name, // Use OU name from join
        supervisor: user.supervisor_name,
        manager: user.manager_name,
        joinDate: user.tjoindate || user.tcreatedat, // Use tjoindate if available, fallback to tcreatedat
        lastLogin: user.tlastlogin, // Use tlastlogin field
        profilePhoto: user.dprofilephoto,
        onlineStatus: user.donlinestatus || 'offline',
        accountStatus: user.daccountstatus
    };
    }
  /**
   * Format team member data
   */
  formatTeamMember(member) {
    return {
      id: member.did,
      name: `${member.dfirstname} ${member.dlastname}`,
      email: member.demail,
      role: member.role_name || member.drole,
      supervisorId: member.dsupervisorid
    };
  }
}

module.exports = ProfileModel;