const { query } = require('../config/db');

class ChatModel {
  static async createConversation({ dname, dtype, dcreatedBy }) {
    const result = await query(
      `INSERT INTO "tblconversations" (dname, dtype, dcreatedBy, tcreatedAt)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [dname, dtype, dcreatedBy]
    );
    return result.rows[0];
  }

  static async findExistingDirectConversation(userId1, userId2) {
    try {
      console.log('Checking for existing direct conversation between:', userId1, 'and', userId2);
      
      const result = await query(
        `SELECT DISTINCT c.*
         FROM tblconversations c
         JOIN tblconversationparticipants cp1 ON c.did = cp1.dconversationid
         JOIN tblconversationparticipants cp2 ON c.did = cp2.dconversationid
         WHERE c.dtype = 'direct'
           AND cp1.duserid = $1
           AND cp2.duserid = $2
           AND cp1.duserid != cp2.duserid
         LIMIT 1`,
        [userId1, userId2]
      );
      
      console.log(`Found ${result.rows.length} existing direct conversations`);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error checking for existing conversation:', error);
      throw error;
    }
  }

static async addMessage({ dconversationId, dsenderId, dcontent, dmessageType, dreplyToId, dreplyToSenderId, dreplyToContent }) {
  try {
    console.log('Adding message to database:', { 
      dconversationId, dsenderId, dcontent, dmessageType, dreplyToId 
    });
    
    // Build dynamic query based on whether it's a reply
    let query_text, params;
    
    if (dreplyToId) {
      query_text = `INSERT INTO tblmessages 
        (dconversationid, dsenderid, dcontent, dmessagetype, dreplytomessageid, tcreatedat)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`;
      params = [dconversationId, dsenderId, dcontent, dmessageType || 'text', dreplyToId];
    } else {
      query_text = `INSERT INTO tblmessages 
        (dconversationid, dsenderid, dcontent, dmessagetype, tcreatedat)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`;
      params = [dconversationId, dsenderId, dcontent, dmessageType || 'text'];
    }
    
    const result = await query(query_text, params);
    
    console.log('Message added:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

  static async getMessagesByConversation(conversationId) {
    const result = await query(
      `SELECT m.*, u.dusername,
              reply_msg.dcontent as reply_content,
              reply_msg.dsenderid as reply_sender_id,
              reply_msg.tcreatedat as reply_timestamp,
              reply_sender.dusername as reply_sender_username,
              reply_sender.dfirstname as reply_sender_firstname,
              reply_sender.dlastname as reply_sender_lastname
       FROM "tblmessages" m
       JOIN "tblusers" u ON m.dsenderId = u.did
       LEFT JOIN "tblmessages" reply_msg ON m.dreplytomessageid = reply_msg.did
       LEFT JOIN "tblusers" reply_sender ON reply_msg.dsenderid = reply_sender.did
       WHERE m.dconversationId = $1
       ORDER BY m.tcreatedAt ASC`,
      [conversationId]
    );
    return result.rows;
  }
  
static async getUserConversations(userId) {
  console.log('DB query for conversations of user:', userId);
  
  try {
    const result = await query(
      `SELECT DISTINCT c.*, 
              jsonb_agg(
                jsonb_build_object(
                  'userId', u.did,
                  'username', u.dusername,
                  'firstName', u.dfirstname,
                  'lastName', u.dlastname,
                  'avatar', u.dprofilephotourl
                )
              ) as members
       FROM tblconversations c
       JOIN tblconversationparticipants cp ON c.did = cp.dconversationid
       JOIN tblusers u ON cp.duserid = u.did
       WHERE c.did IN (
         SELECT DISTINCT c2.did
         FROM tblconversations c2
         JOIN tblconversationparticipants cp2 ON c2.did = cp2.dconversationid
         WHERE cp2.duserid = $1
       )
       GROUP BY c.did, c.dname, c.dtype, c.dcreatedby, c.tcreatedat, c.tupdatedat
       ORDER BY c.tcreatedat DESC`,
      [userId]
    );
    
    // Log and return the results
    console.log(`Found ${result.rows.length} conversations in database with member info`);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

static async addMember(conversationId, userId) {
  try {
    console.log('Adding member to conversation:', { conversationId, userId });
    
    // First check if member already exists
    const checkResult = await query(
      'SELECT * FROM tblconversationparticipants WHERE dconversationid = $1 AND duserid = $2',
      [conversationId, userId]
    );
    
    // If member already exists, just return that record
    if (checkResult.rows.length > 0) {
      console.log('Member already exists in conversation:', checkResult.rows[0]);
      return checkResult.rows[0];
    }
    
    // Otherwise add the member
    const result = await query(
      'INSERT INTO tblconversationparticipants (dconversationid, duserid) VALUES ($1, $2) RETURNING *',
      [conversationId, userId]
    );
    
    console.log('Member added successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding member to conversation:', error);
    throw error;
  }
}

static async getMessagesWithMetadata(conversationId, userId, offset = 0, limit = 50) {
  try {
    console.log(`Fetching messages for conversation ${conversationId} with offset ${offset}, limit ${limit}`);
    
    const result = await query(`
      SELECT 
        m.*,
        u.dusername,
        u.dfirstname,
        u.dlastname,
        u.avatar,
        CASE WHEN rs.duserid IS NOT NULL THEN true ELSE false END as "isRead",
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'emoji', mr.demoji,
              'userId', mr.duserid,
              'timestamp', mr.tcreatedat
            )
          )
          FROM tblmessagereactions mr 
          WHERE mr.dmessageid = m.did), '[]'
        ) as reactions
      FROM tblmessages m
      JOIN tblusers u ON m.dsenderid = u.did
      LEFT JOIN tblreadstatus rs ON m.did = rs.dmessageid AND rs.duserid = $2
      WHERE m.dconversationid = $1
      ORDER BY m.tcreatedat ASC
      LIMIT $3 OFFSET $4`,
      [conversationId, userId, limit, offset]
    );
    
    console.log(`Found ${result.rows.length} messages`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching messages with metadata:', error);
    throw error;
  }
}

static async markMessageAsRead(messageId, userId) {
  try {
    const checkResult = await query(
      'SELECT * FROM tblreadstatus WHERE dmessageid = $1 AND duserid = $2',
      [messageId, userId]
    );
    
    // If already marked as read, return that record
    if (checkResult.rows.length > 0) {
      return checkResult.rows[0];
    }
    
    const result = await query(
      `INSERT INTO tblreadstatus 
        (dmessageid, duserid, treadat)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING *`,
      [messageId, userId]
    );
    
    console.log('Message marked as read:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}
static async toggleReaction(messageId, userId, emoji) {
  try {
    console.log('🔍 toggleReaction called with:', { messageId, userId, emoji });
    
    // First, let's check what tables actually exist
    console.log('🔍 Checking available tables...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check specifically for reactions table (try different possible names)
    const reactionsTableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%reaction%'
    `);
    
    console.log('🎯 Reaction-related tables:', reactionsTableCheck.rows.map(r => r.table_name));
    
    // If the exact table doesn't exist, throw a more helpful error
    const exactTableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tblmessagereactions'
    `);
    
    if (exactTableCheck.rows.length === 0) {
      throw new Error(`Table 'tblmessagereactions' does not exist. Available tables: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
    }
    
    console.log('🔍 About to query tblmessagereactions table...');
    
    // Check if reaction already exists
    const checkResult = await query(
      'SELECT * FROM tblmessagereactions WHERE dmessageid = $1 AND duserid = $2 AND demoji = $3',
      [messageId, userId, emoji]
    );
    
    console.log('🔍 Check query result:', checkResult.rows.length, 'rows found');
    
    // If reaction exists, remove it
    if (checkResult.rows.length > 0) {
      await query(
        'DELETE FROM tblmessagereactions WHERE dmessageid = $1 AND duserid = $2 AND demoji = $3',
        [messageId, userId, emoji]
      );
      
      console.log('Reaction removed');
      return { removed: true, emoji };
    }
    
    // Otherwise add the reaction
    const result = await query(
      `INSERT INTO tblmessagereactions 
        (dmessageid, duserid, demoji, tcreatedat)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [messageId, userId, emoji]
    );
    
    console.log('Reaction added:', result.rows[0]);
    return { added: true, reaction: result.rows[0] };
  } catch (error) {
    console.error('Error toggling reaction:', error);
    throw error;
  }
}


}



module.exports = ChatModel;