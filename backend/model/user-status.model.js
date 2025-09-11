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
      const result = await query(
        `SELECT did, dusername, dfirstname, dlastname, demail, dou, drole, 
                dprofilephotourl, dlastactivity, donlinestatus,
                EXTRACT(EPOCH FROM (NOW() - dlastactivity)) as seconds_since_activity
         FROM tblusers 
         WHERE daccountstatus = 'active'
         ORDER BY dusername`,
        []
      );
      
      return result.rows.map(user => {
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
          actualStatus,
          secondsSinceActivity,
          isOnline: actualStatus === 'online'
        };
      });
    } catch (error) {
      console.error('Error getting all users with status:', error);
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