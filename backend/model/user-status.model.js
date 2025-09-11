const { query } = require('../config/db');

class UserStatusModel {
  /**
   * Update user's online status
   */
  static async updateUserStatus(userId, status, lastActivity = new Date()) {
    try {
      const result = await query(
        `UPDATE tblusers 
         SET dlastactivity = $2, donlinestatus = $3, tupdatedat = NOW()
         WHERE did = $1 
         RETURNING did, dusername, dlastactivity, donlinestatus`,
        [userId, lastActivity, status]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Get user's current status
   */
  static async getUserStatus(userId) {
    try {
      const result = await query(
        `SELECT did, dusername, dlastactivity, donlinestatus, 
                EXTRACT(EPOCH FROM (NOW() - dlastactivity)) as seconds_since_activity
         FROM tblusers 
         WHERE did = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];
      
      // Determine actual status based on last activity
      const secondsSinceActivity = parseInt(user.seconds_since_activity || 0);
      let actualStatus = user.donlinestatus || 'offline';
      
      // Auto-update status based on activity
      if (secondsSinceActivity > 300) { // 5 minutes
        actualStatus = 'offline';
      } else if (secondsSinceActivity > 180) { // 3 minutes
        actualStatus = 'away';
      } else if (secondsSinceActivity > 60) { // 1 minute
        actualStatus = 'idle';
      } else if (user.donlinestatus === 'online') {
        actualStatus = 'online';
      }

      return {
        ...user,
        actualStatus,
        secondsSinceActivity
      };
    } catch (error) {
      console.error('Error getting user status:', error);
      throw error;
    }
  }

  /**
   * Get all users with their status
   */
  static async getAllUsersWithStatus() {
    try {
      // First get all active users
      const usersResult = await query(
        `SELECT 
          u.did, u.dusername, u.dfirstname, u.dlastname, u.demail, 
          u.dprofilephotourl, u.dlastactivity, u.donlinestatus,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(u.dlastactivity, NOW()))) as seconds_since_activity
         FROM tblusers u
         WHERE u.daccountstatus = 'active'
         ORDER BY u.dusername`,
        []
      );

      console.log(`🔍 Found ${usersResult.rows.length} active users in database`);

      // Then get role/OU info for each user (taking first role if multiple)
      const usersWithRoles = [];
      
      for (const user of usersResult.rows) {
        try {
          const roleResult = await query(
            `SELECT 
              COALESCE(r.dname, 'Unknown') as drole,
              COALESCE(ou.dname, 'Unknown') as dou
             FROM tbluserroles ur
             LEFT JOIN tblroles r ON ur.droleid = r.did
             LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
             WHERE ur.duserid = $1
             LIMIT 1`,
            [user.did]
          );

          const roleInfo = roleResult.rows[0] || { drole: 'Unknown', dou: 'Unknown' };
          
          const secondsSinceActivity = parseInt(user.seconds_since_activity || 0);
          let actualStatus = user.donlinestatus || 'offline';
          
          // Auto-update status based on activity
          if (secondsSinceActivity > 300) { // 5 minutes
            actualStatus = 'offline';
          } else if (secondsSinceActivity > 180) { // 3 minutes
            actualStatus = 'away';
          } else if (secondsSinceActivity > 60) { // 1 minute
            actualStatus = 'idle';
          } else if (user.donlinestatus === 'online') {
            actualStatus = 'online';
          }

          const userWithRole = {
            id: user.did,
            username: user.dusername,
            firstName: user.dfirstname || '',
            lastName: user.dlastname || '',
            email: user.demail,
            organizationalUnit: roleInfo.dou,
            role: roleInfo.drole,
            avatar: user.dprofilephotourl,
            lastActivity: user.dlastactivity,
            onlineStatus: user.donlinestatus,
            status: actualStatus,
            isOnline: actualStatus === 'online'
          };
          
          console.log(`✅ Processed user: ${user.dusername} -> Role: ${roleInfo.drole}, OU: ${roleInfo.dou}`);
          usersWithRoles.push(userWithRole);
          
        } catch (roleError) {
          console.error(`❌ Error processing user ${user.dusername}:`, roleError);
          // Still add the user with default role info
          const userWithRole = {
            id: user.did,
            username: user.dusername,
            firstName: user.dfirstname || '',
            lastName: user.dlastname || '',
            email: user.demail,
            organizationalUnit: 'Unknown',
            role: 'Unknown',
            avatar: user.dprofilephotourl,
            lastActivity: user.dlastactivity,
            onlineStatus: user.donlinestatus,
            status: 'offline',
            isOnline: false
          };
          usersWithRoles.push(userWithRole);
        }
      }

      console.log(`🔍 Final result: ${usersWithRoles.length} users with role info`);
      return usersWithRoles;
    } catch (error) {
      console.error('Error getting all users with status:', error);
      throw error;
    }
  }

  /**
   * Get user by username with status
   */
  static async getUserByUsername(username) {
    try {
      const result = await query(
        `SELECT 
          u.did, u.dusername, u.dfirstname, u.dlastname, u.demail, 
          COALESCE(ou.dname, 'Unknown') as dou, 
          COALESCE(r.dname, 'Unknown') as drole,
          u.dprofilephotourl, u.dlastactivity, u.donlinestatus,
          EXTRACT(EPOCH FROM (NOW() - COALESCE(u.dlastactivity, NOW()))) as seconds_since_activity
         FROM tblusers u
         LEFT JOIN tbluserroles ur ON u.did = ur.duserid
         LEFT JOIN tblroles r ON ur.droleid = r.did
         LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
         WHERE LOWER(u.dusername) = LOWER($1) AND u.daccountstatus = 'active'`,
        [username]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const user = result.rows[0];
      const secondsSinceActivity = parseInt(user.seconds_since_activity || 0);
      let actualStatus = user.donlinestatus || 'offline';
      
      // Auto-update status based on activity
      if (secondsSinceActivity > 300) { // 5 minutes
        actualStatus = 'offline';
      } else if (secondsSinceActivity > 180) { // 3 minutes
        actualStatus = 'away';
      } else if (secondsSinceActivity > 60) { // 1 minute
        actualStatus = 'idle';
      } else if (user.donlinestatus === 'online') {
        actualStatus = 'online';
      }

      return {
        id: user.did,
        username: user.dusername,
        firstName: user.dfirstname || '',
        lastName: user.dlastname || '',
        email: user.demail,
        organizationalUnit: user.dou,
        role: user.drole,
        avatar: user.dprofilephotourl,
        lastActivity: user.dlastactivity,
        onlineStatus: user.donlinestatus,
        status: actualStatus,
        isOnline: actualStatus === 'online'
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  /**
   * Update user's last activity (for heartbeat)
   */
  static async updateLastActivity(userId) {
    try {
      const result = await query(
        `UPDATE tblusers 
         SET dlastactivity = NOW()
         WHERE did = $1 
         RETURNING did, dusername, dlastactivity`,
        [userId]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating last activity:', error);
      throw error;
    }
  }

  /**
   * Set user as online
   */
  static async setUserOnline(userId) {
    return this.updateUserStatus(userId, 'online', new Date());
  }

  /**
   * Set user as offline
   */
  static async setUserOffline(userId) {
    return this.updateUserStatus(userId, 'offline', new Date());
  }

  /**
   * Set user as away
   */
  static async setUserAway(userId) {
    return this.updateUserStatus(userId, 'away', new Date());
  }

  /**
   * Set user as idle
   */
  static async setUserIdle(userId) {
    return this.updateUserStatus(userId, 'idle', new Date());
  }
}

module.exports = UserStatusModel;