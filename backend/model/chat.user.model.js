const { query } = require('../config/db');

exports.getAll = async () => {
  try {
    console.log('🔍 Executing user query to get all active users...');
    
    // First get all active users
    const usersResult = await query(`
      SELECT 
        u.did as id,
        u.dusername as username,
        u.dfirstname as firstName,
        u.dlastname as lastName,
        u.demail as email,
        u.dprofilephotourl as avatar,
        COALESCE(u.dlastactivity, NOW()) as lastActivity,
        COALESCE(u.donlinestatus, 'offline') as onlineStatus,
        u.daccountstatus as accountStatus,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(u.dlastactivity, NOW()))) as secondsSinceActivity
      FROM tblusers u
      WHERE u.daccountstatus = 'active'
      ORDER BY u.dusername
    `, []);
    
    console.log(`✅ Found ${usersResult.rows.length} active users`);
    
    // Then get role/OU info for each user
    const usersWithRoles = [];
    
    for (const user of usersResult.rows) {
      try {
        const roleResult = await query(
          `SELECT 
            COALESCE(r.dname, 'Unknown') as role,
            COALESCE(ou.dname, 'Unknown') as organizationalUnit
           FROM tbluserroles ur
           LEFT JOIN tblroles r ON ur.droleid = r.did
           LEFT JOIN tblorganizationalunits ou ON ur.douid = ou.did
           WHERE ur.duserid = $1
           LIMIT 1`,
          [user.id]
        );

        const roleInfo = roleResult.rows[0] || { role: 'Unknown', organizationalUnit: 'Unknown' };
        
        const secondsSinceActivity = parseInt(user.secondssinceactivity || 0);
        let actualStatus = user.onlinestatus || 'offline';
        
        // Auto-update status based on activity
        if (secondsSinceActivity > 300) { // 5 minutes
          actualStatus = 'offline';
        } else if (secondsSinceActivity > 180) { // 3 minutes
          actualStatus = 'away';
        } else if (secondsSinceActivity > 60) { // 1 minute
          actualStatus = 'idle';
        } else if (user.onlinestatus === 'online') {
          actualStatus = 'online';
        }

        const userWithRole = {
          id: user.id,
          username: user.username,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          organizationalUnit: roleInfo.organizationalUnit,
          role: roleInfo.role,
          avatar: user.avatar,
          lastActivity: user.lastactivity,
          onlineStatus: user.onlinestatus,
          accountStatus: user.accountstatus,
          status: actualStatus,
          isOnline: actualStatus === 'online',
          // Additional fields for chat compatibility
          name: `${user.firstname} ${user.lastname}`.trim() || user.username,
          department: roleInfo.organizationalUnit
        };
        
        console.log(`✅ Processed user: ${user.username} -> Role: ${roleInfo.role}`);
        usersWithRoles.push(userWithRole);
        
      } catch (roleError) {
        console.error(`❌ Error processing user ${user.username}:`, roleError);
        // Still add the user with default role info
        const userWithRole = {
          id: user.id,
          username: user.username,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email,
          organizationalUnit: 'Unknown',
          role: 'Unknown',
          avatar: user.avatar,
          lastActivity: user.lastactivity,
          onlineStatus: user.onlinestatus,
          accountStatus: user.accountstatus,
          status: 'offline',
          isOnline: false,
          name: `${user.firstname} ${user.lastname}`.trim() || user.username,
          department: 'Unknown'
        };
        usersWithRoles.push(userWithRole);
      }
    }

    console.log(`🔍 Final result: ${usersWithRoles.length} users with role info`);
    return usersWithRoles;
  } catch (error) {
    console.error('❌ Error in chat.user.model.getAll:', error);
    console.error('❌ Error message:', error.message);
    throw error;
  }
};