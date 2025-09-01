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

static async addMessage({ dconversationId, dsenderId, dcontent, dmessageType }) {
  try {
    console.log('Adding message to database:', { 
      dconversationId, dsenderId, dcontent, dmessageType 
    });
    
    const result = await query(
      `INSERT INTO tblmessages 
        (dconversationid, dsenderid, dcontent, dmessagetype, tcreatedat)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [dconversationId, dsenderId, dcontent, dmessageType || 'text']
    );
    
    console.log('Message added:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

  static async getMessagesByConversation(conversationId) {
    const result = await query(
      `SELECT m.*, u.dusername
       FROM "tblmessages" m
       JOIN "tblusers" u ON m.dsenderId = u.did
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
      `SELECT DISTINCT c.*
       FROM tblconversations c
       JOIN tblconversationparticipants cm ON c.did = cm.dconversationid
       WHERE cm.duserid = $1
       ORDER BY c.tcreatedat DESC`,
      [userId]
    );
    
    // Log and return the results
    console.log(`Found ${result.rows.length} conversations in database`);
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

static async getMessagesWithMetadata(conversationId, userId) {
  try {
    console.log(`Fetching messages for conversation ${conversationId}`);
    
    const result = await query(`
      SELECT 
        m.*,
        u.dusername,
        u.firstname,
        u.lastname,
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
          FROM tblmessagesreactions mr 
          WHERE mr.dmessageid = m.did), '[]'
        ) as reactions
      FROM tblmessages m
      JOIN tblusers u ON m.dsenderid = u.did
      LEFT JOIN tblreadstatus rs ON m.did = rs.dmessageid AND rs.duserid = $2
      WHERE m.dconversationid = $1
      ORDER BY m.tcreatedat ASC`,
      [conversationId, userId]
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
    // Check if reaction already exists
    const checkResult = await query(
      'SELECT * FROM tblmessagesreactions WHERE dmessageid = $1 AND duserid = $2 AND demoji = $3',
      [messageId, userId, emoji]
    );
    
    // If reaction exists, remove it
    if (checkResult.rows.length > 0) {
      await query(
        'DELETE FROM tblmessagesreactions WHERE dmessageid = $1 AND duserid = $2 AND demoji = $3',
        [messageId, userId, emoji]
      );
      
      console.log('Reaction removed');
      return { removed: true, emoji };
    }
    
    // Otherwise add the reaction
    const result = await query(
      `INSERT INTO tblmessagesreactions 
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

static async getMessagesByConversation(conversationId) {
  const result = await query(
    `SELECT m.*, u.dusername
     FROM tblmessages m
     JOIN tblusers u ON m.dsenderid = u.did
     WHERE m.dconversationid = $1
     ORDER BY m.tcreatedat ASC`,
    [conversationId]
  );
  return result.rows;
}
}



module.exports = ChatModel;