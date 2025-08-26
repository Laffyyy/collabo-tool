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
    const result = await query(
      `INSERT INTO "tblmessages" (dconversationId, dsenderId, dcontent, dmessageType, tcreatedAt)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [dconversationId, dsenderId, dcontent, dmessageType || 'text']
    );
    return result.rows[0];
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
}

module.exports = ChatModel;