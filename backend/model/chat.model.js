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
    try {
      const result = await query(
        `SELECT DISTINCT c.*
         FROM "tblconversations" c
         LEFT JOIN "tblconversationparticipants" cm ON c.did = cm.dconversationid
         WHERE cm.duserid = $1
         ORDER BY c.tcreatedat DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }
}

module.exports = ChatModel;