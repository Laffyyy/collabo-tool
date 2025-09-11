const { query } = require('../config/db');

exports.getAll = async () => {
  const result = await query(`
    SELECT 
      did as id,
      dusername as username,
      dfirstname as firstName,
      dlastname as lastName,
      demail as email,
      dou as organizationalUnit,
      drole as role,
      dprofilephotourl as avatar,
      dlastactivity as lastActivity,
      donlinestatus as onlineStatus,
      daccountstatus as accountStatus,
      EXTRACT(EPOCH FROM (NOW() - COALESCE(dlastactivity, NOW()))) as secondsSinceActivity
    FROM tblusers 
    WHERE daccountstatus = 'active'
    ORDER BY dusername
  `, []);
  
  // Process the results to determine actual status
  return result.rows.map(user => {
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

    return {
      ...user,
      status: actualStatus,
      isOnline: actualStatus === 'online',
      lastActivity: user.lastactivity
    };
  });
};