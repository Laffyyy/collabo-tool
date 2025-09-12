const { query } = require('../config/db');

class AdminChatModel {
  // Get all conversations with metadata for admin view
  static async getAllConversations({ limit = 50, offset = 0, type = null, search = null, status = 'active' } = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramCount = 0;
      
      // Base query using actual database column names
      let baseQuery = `
        SELECT DISTINCT 
          c.did as id,
          c.dname as name,
          c.dtype as type,
          c.dcreatedby as created_by,
          c.tcreatedat as created_at,
          c.tupdatedat as updated_at,
          COALESCE(c.disarchived, false) as archived,
          COUNT(DISTINCT m.did) as message_count,
          MAX(m.tcreatedat) as last_activity,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'userId', u.did,
              'username', u.dusername,
              'firstName', u.dfirstname,
              'lastName', u.dlastname,
              'email', u.demail
            )
          ) as participants
        FROM tblconversations c
        LEFT JOIN tblconversationparticipants cp ON c.did = cp.dconversationid
        LEFT JOIN tblusers u ON cp.duserid = u.did
        LEFT JOIN tblmessages m ON c.did = m.dconversationid AND COALESCE(m.tisdeleted, false) = false
      `;
      
      // Add status filter using actual column name
      if (status === 'archived') {
        whereConditions.push(`COALESCE(c.disarchived, false) = true`);
      } else if (status === 'active') {
        whereConditions.push(`COALESCE(c.disarchived, false) = false`);
      }
      
      // Add type filter
      if (type && type !== 'all') {
        paramCount++;
        whereConditions.push(`c.dtype = $${paramCount}`);
        params.push(type === '1v1' ? 'direct' : type);
      }
      
      // Add search filter
      if (search && search.trim()) {
        paramCount++;
        whereConditions.push(`(
          c.dname ILIKE $${paramCount} OR 
          u.dusername ILIKE $${paramCount} OR 
          u.demail ILIKE $${paramCount}
        )`);
        params.push(`%${search.trim()}%`);
      }
      
      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add GROUP BY and ORDER BY using actual column names
      baseQuery += `
        GROUP BY c.did, c.dname, c.dtype, c.dcreatedby, c.tcreatedat, c.tupdatedat, c.disarchived
        ORDER BY last_activity DESC NULLS LAST
      `;
      
      // Add pagination
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(offset);
      
      console.log('Admin Chat Query:', baseQuery);
      console.log('Parameters:', params);
      
      const result = await query(baseQuery, params);
      
      // Transform the data to match frontend expectations
      const conversations = result.rows.map(row => ({
        id: row.id,
        name: row.name || (row.type === 'direct' ? 
          row.participants?.map(p => p.username).join(' and ') || 'Direct Chat' : 
          'Group Chat'),
        type: row.type === 'direct' ? '1v1' : 'group',
        participants: row.participants?.map(p => p.email || p.username) || [],
        messageCount: parseInt(row.message_count) || 0,
        lastActivity: row.last_activity,
        archived: row.archived || false,
        createdBy: row.created_by,
        createdAt: row.created_at
      }));
      
      console.log(`Found ${conversations.length} conversations for admin`);
      return conversations;
    } catch (error) {
      console.error('Error fetching admin conversations:', error);
      throw error;
    }
  }

  // Get all messages with admin metadata
  static async getAllMessages({ limit = 100, offset = 0, type = null, search = null, flagged = null } = {}) {
    try {
      let whereConditions = [];
      let params = [];
      let paramCount = 0;
      
      // Updated to use tblchatflags for proper flagged message detection
      let baseQuery = `
        SELECT 
          m.did as id,
          m.dconversationid as conversation_id,
          c.dname as conversation_name,
          c.dtype as conversation_type,
          m.dsenderid as sender_id,
          u.dusername as sender_username,
          u.demail as sender_email,
          u.dfirstname as sender_first_name,
          u.dlastname as sender_last_name,
          m.dcontent as content,
          m.dmessagetype as message_type,
          m.tcreatedat as timestamp,
          CASE 
            WHEN cf.dmessageid IS NOT NULL AND (cf.dstatus = 'pending' OR cf.dstatus = 'reviewed') 
            THEN true 
            ELSE false 
          END as flagged,
          cf.dreason as flag_reason,
          'content' as flag_type,
          cf.dstatus as flag_status,
          cf.dflaggedby as flagged_by_id,
          fb.dusername as flagged_by_username,
          COALESCE(m.tisdeleted, false) as deleted,
          m.dpinnedby as pinned_by,
          m.tpinnedat as pinned_at
        FROM tblmessages m
        JOIN tblusers u ON m.dsenderid = u.did
        JOIN tblconversations c ON m.dconversationid = c.did
        LEFT JOIN tblchatflags cf ON m.did = cf.dmessageid AND (cf.dstatus = 'pending' OR cf.dstatus = 'reviewed')
        LEFT JOIN tblusers fb ON cf.dflaggedby = fb.did
      `;
      
      // Now we can properly filter by flagged status using tblchatflags
      if (flagged !== null) {
        if (flagged === true || flagged === 'true') {
          whereConditions.push(`cf.dmessageid IS NOT NULL AND (cf.dstatus = 'pending' OR cf.dstatus = 'reviewed')`);
        } else if (flagged === false || flagged === 'false') {
          whereConditions.push(`(cf.dmessageid IS NULL OR cf.dstatus = 'dismissed')`);
        }
      }
      
      // Add type filter
      if (type && type !== 'all') {
        paramCount++;
        whereConditions.push(`c.dtype = $${paramCount}`);
        params.push(type === '1v1' ? 'direct' : type);
      }
      
      // Add search filter
      if (search && search.trim()) {
        paramCount++;
        whereConditions.push(`(
          m.dcontent ILIKE $${paramCount} OR 
          c.dname ILIKE $${paramCount} OR
          u.dusername ILIKE $${paramCount} OR 
          u.demail ILIKE $${paramCount}
        )`);
        params.push(`%${search.trim()}%`);
      }
      
      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        baseQuery += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Add ORDER BY clause
      baseQuery += `
        ORDER BY m.tcreatedat DESC
      `;
      
      // Add pagination
      paramCount++;
      baseQuery += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      baseQuery += ` OFFSET $${paramCount}`;
      params.push(offset);
      
      console.log('Admin Messages Query:', baseQuery);
      console.log('Parameters:', params);
      
      const result = await query(baseQuery, params);
      
      // Transform the data to match frontend expectations
      const messages = result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        conversationName: row.conversation_name || (row.conversation_type === 'direct' ? 
          `${row.sender_username} Direct Chat` : 'Group Chat'),
        sender: row.sender_email || row.sender_username,
        senderName: row.sender_first_name && row.sender_last_name ? 
          `${row.sender_first_name} ${row.sender_last_name}` : row.sender_username,
        content: row.content,
        timestamp: row.timestamp,
        type: row.conversation_type === 'direct' ? '1v1' : 'group',
        flagged: row.flagged || false,
        flagReason: row.flag_reason,
        flagType: row.flag_type,
        flagStatus: row.flag_status,
        flaggedBy: row.flagged_by_id ? {
          id: row.flagged_by_id,
          username: row.flagged_by_username
        } : null,
        participants: [], // Simplified - we can add this back later if needed
        status: row.deleted ? 'deleted' : 'active'
      }));
      
      console.log(`Found ${messages.length} messages for admin`);
      return messages;
    } catch (error) {
      console.error('Error fetching admin messages:', error);
      throw error;
    }
  }

  // Get only flagged messages
  static async getFlaggedMessages({ limit = 100, offset = 0, search = null } = {}) {
    try {
      let whereConditions = ['cf.dstatus IN ($1, $2)'];
      let params = ['pending', 'reviewed'];
      let paramCount = 2;
      
      // Add search filter
      if (search && search.trim()) {
        paramCount++;
        whereConditions.push(`(
          m.dcontent ILIKE $${paramCount} OR 
          c.dname ILIKE $${paramCount} OR
          u.dusername ILIKE $${paramCount} OR 
          u.demail ILIKE $${paramCount} OR
          cf.dreason ILIKE $${paramCount}
        )`);
        params.push(`%${search.trim()}%`);
      }
      
      const baseQuery = `
        SELECT 
          m.did as id,
          m.dconversationid as conversation_id,
          c.dname as conversation_name,
          c.dtype as conversation_type,
          m.dsenderid as sender_id,
          u.dusername as sender_username,
          u.demail as sender_email,
          u.dfirstname as sender_first_name,
          u.dlastname as sender_last_name,
          m.dcontent as content,
          m.dmessagetype as message_type,
          m.tcreatedat as timestamp,
          true as flagged,
          cf.dreason as flag_reason,
          'content' as flag_type,
          cf.dstatus as flag_status,
          cf.dflaggedby as flagged_by_id,
          fb.dusername as flagged_by_username,
          cf.dflaggedon as flagged_at,
          cf.dreviewedby as reviewed_by_id,
          rb.dusername as reviewed_by_username,
          cf.dreviewedon as reviewed_at,
          COALESCE(m.tisdeleted, false) as deleted
        FROM tblchatflags cf
        JOIN tblmessages m ON cf.dmessageid = m.did
        JOIN tblusers u ON m.dsenderid = u.did
        JOIN tblconversations c ON m.dconversationid = c.did
        JOIN tblusers fb ON cf.dflaggedby = fb.did
        LEFT JOIN tblusers rb ON cf.dreviewedby = rb.did
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY cf.dflaggedon DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      params.push(limit, offset);
      
      console.log('Flagged Messages Query:', baseQuery);
      console.log('Parameters:', params);
      
      const result = await query(baseQuery, params);
      
      // Transform the data to match frontend expectations
      const messages = result.rows.map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        conversationName: row.conversation_name || (row.conversation_type === 'direct' ? 
          `${row.sender_username} Direct Chat` : 'Group Chat'),
        sender: row.sender_email || row.sender_username,
        senderName: row.sender_first_name && row.sender_last_name ? 
          `${row.sender_first_name} ${row.sender_last_name}` : row.sender_username,
        content: row.content,
        timestamp: row.timestamp,
        type: row.conversation_type === 'direct' ? '1v1' : 'group',
        flagged: true,
        flagReason: row.flag_reason,
        flagType: row.flag_type,
        flagStatus: row.flag_status,
        flaggedBy: {
          id: row.flagged_by_id,
          username: row.flagged_by_username
        },
        flaggedAt: row.flagged_at,
        reviewedBy: row.reviewed_by_id ? {
          id: row.reviewed_by_id,
          username: row.reviewed_by_username
        } : null,
        reviewedAt: row.reviewed_at,
        status: row.deleted ? 'deleted' : 'active'
      }));
      
      console.log(`Found ${messages.length} flagged messages`);
      return messages;
    } catch (error) {
      console.error('Error fetching flagged messages:', error);
      throw error;
    }
  }

  // Flag a message (using proper tblchatflags table)
  static async flagMessage(messageId, flagType, flagReason, adminUserId) {
    try {
      // First check if message exists
      const messageCheck = await query(
        'SELECT * FROM tblmessages WHERE did = $1',
        [messageId]
      );
      
      if (messageCheck.rows.length === 0) {
        throw new Error('Message not found');
      }
      
      // Check if message is already flagged (and not dismissed)
      const existingFlag = await query(
        'SELECT * FROM tblchatflags WHERE dmessageid = $1 AND dstatus != $2',
        [messageId, 'dismissed']
      );
      
      if (existingFlag.rows.length > 0) {
        throw new Error('Message is already flagged');
      }
      
      // Insert new flag record
      const flagResult = await query(
        `INSERT INTO tblchatflags 
         (dmessageid, dflaggedby, dreason, dstatus, dflaggedon) 
         VALUES ($1, $2, $3, $4, NOW()) 
         RETURNING *`,
        [messageId, adminUserId, flagReason, 'pending']
      );
      
      console.log(`Message ${messageId} flagged by admin ${adminUserId} - Type: ${flagType}, Reason: ${flagReason}`);
      
      return {
        id: messageId,
        flagged: true,
        flag_type: flagType,
        flag_reason: flagReason,
        flag_status: 'pending',
        flagged_by: adminUserId,
        flagged_at: flagResult.rows[0].dflaggedon
      };
    } catch (error) {
      console.error('Error flagging message:', error);
      throw error;
    }
  }

  // Unflag a message (dismiss the flag)
  static async unflagMessage(messageId, adminUserId) {
    try {
      // First check if message exists
      const messageCheck = await query(
        'SELECT * FROM tblmessages WHERE did = $1',
        [messageId]
      );
      
      if (messageCheck.rows.length === 0) {
        throw new Error('Message not found');
      }
      
      // Check if message is currently flagged
      const flagCheck = await query(
        'SELECT * FROM tblchatflags WHERE dmessageid = $1 AND dstatus != $2',
        [messageId, 'dismissed']
      );
      
      if (flagCheck.rows.length === 0) {
        throw new Error('Message is not currently flagged');
      }
      
      // Update flag status to dismissed
      const result = await query(
        `UPDATE tblchatflags 
         SET dstatus = $1, 
             dreviewedby = $2, 
             dreviewedon = NOW()
         WHERE dmessageid = $3 AND dstatus != $1
         RETURNING *`,
        ['dismissed', adminUserId, messageId]
      );
      
      console.log(`Message ${messageId} unflagged by admin ${adminUserId}`);
      
      return {
        id: messageId,
        flagged: false,
        unflagged_by: adminUserId,
        unflagged_at: new Date(),
        flag_status: 'dismissed'
      };
    } catch (error) {
      console.error('Error unflagging message:', error);
      throw error;
    }
  }

  // Delete a message (soft delete using existing tisdeleted column)
  static async deleteMessage(messageId) {
    try {
      const result = await query(
        `UPDATE tblmessages 
         SET tisdeleted = true, 
             tupdatedat = CURRENT_TIMESTAMP
         WHERE did = $1 
         RETURNING *`,
        [messageId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Message not found');
      }
      
      console.log('Message deleted:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Archive a conversation (using existing disarchived column)
  static async archiveConversation(conversationId) {
    try {
      const result = await query(
        `UPDATE tblconversations 
         SET disarchived = true, 
             tupdatedat = CURRENT_TIMESTAMP
         WHERE did = $1 
         RETURNING *`,
        [conversationId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Conversation not found');
      }
      
      console.log('Conversation archived:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  // Unarchive a conversation
  static async unarchiveConversation(conversationId) {
    try {
      const result = await query(
        `UPDATE tblconversations 
         SET disarchived = false, 
             tupdatedat = CURRENT_TIMESTAMP
         WHERE did = $1 
         RETURNING *`,
        [conversationId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Conversation not found');
      }
      
      console.log('Conversation unarchived:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      throw error;
    }
  }

  // Get conversation with messages for admin view
  static async getConversationWithMessages(conversationId) {
    try {
      // Get conversation details using actual column names
      const convResult = await query(
        `SELECT 
          c.did as id,
          c.dname as name,
          c.dtype as type,
          c.dcreatedby as created_by,
          c.tcreatedat as created_at,
          COALESCE(c.disarchived, false) as archived,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'userId', u.did,
              'username', u.dusername,
              'firstName', u.dfirstname,
              'lastName', u.dlastname,
              'email', u.demail
            )
          ) as participants
         FROM tblconversations c
         LEFT JOIN tblconversationparticipants cp ON c.did = cp.dconversationid
         LEFT JOIN tblusers u ON cp.duserid = u.did
         WHERE c.did = $1
         GROUP BY c.did, c.dname, c.dtype, c.dcreatedby, c.tcreatedat, c.disarchived`,
        [conversationId]
      );
      
      if (convResult.rows.length === 0) {
        throw new Error('Conversation not found');
      }
      
      const conversation = convResult.rows[0];
      
      // Get messages for this conversation using actual column names
      const messagesResult = await query(
        `SELECT 
          m.did as id,
          m.dsenderid as sender_id,
          u.dusername as sender_username,
          u.demail as sender_email,
          u.dfirstname as sender_first_name,
          u.dlastname as sender_last_name,
          m.dcontent as content,
          m.dmessagetype as message_type,
          m.tcreatedat as timestamp,
          false as flagged,
          null as flag_reason,
          null as flag_type,
          COALESCE(m.tisdeleted, false) as deleted,
          m.dpinnedby as pinned_by,
          m.tpinnedat as pinned_at
         FROM tblmessages m
         JOIN tblusers u ON m.dsenderid = u.did
         WHERE m.dconversationid = $1
         ORDER BY m.tcreatedat ASC`,
        [conversationId]
      );
      
      // Transform the data
      const transformedConversation = {
        id: conversation.id,
        name: conversation.name || (conversation.type === 'direct' ? 
          conversation.participants?.map(p => p.username).join(' and ') || 'Direct Chat' : 
          'Group Chat'),
        type: conversation.type === 'direct' ? '1v1' : 'group',
        participants: conversation.participants?.map(p => p.email || p.username) || [],
        messageCount: messagesResult.rows.length,
        lastActivity: messagesResult.rows.length > 0 ? 
          messagesResult.rows[messagesResult.rows.length - 1].timestamp : 
          conversation.created_at,
        archived: conversation.archived,
        messages: messagesResult.rows.map(row => ({
          id: row.id,
          conversationId: conversationId,
          conversationName: conversation.name,
          sender: row.sender_email || row.sender_username,
          senderName: row.sender_first_name && row.sender_last_name ? 
            `${row.sender_first_name} ${row.sender_last_name}` : row.sender_username,
          content: row.content,
          timestamp: row.timestamp,
          type: conversation.type === 'direct' ? '1v1' : 'group',
          flagged: row.flagged,
          flagReason: row.flag_reason,
          flagType: row.flag_type,
          participants: conversation.participants?.map(p => p.email || p.username) || [],
          status: row.deleted ? 'deleted' : 'active'
        }))
      };
      
      console.log(`Found conversation with ${transformedConversation.messages.length} messages`);
      return transformedConversation;
    } catch (error) {
      console.error('Error fetching conversation with messages:', error);
      throw error;
    }
  }

  // Get chat management statistics using actual column names
  static async getChatStatistics() {
    try {
      const stats = await query(`
        SELECT 
          (SELECT COUNT(*) FROM tblconversations WHERE COALESCE(disarchived, false) = false) as active_conversations,
          (SELECT COUNT(*) FROM tblconversations WHERE COALESCE(disarchived, false) = true) as archived_conversations,
          (SELECT COUNT(*) FROM tblmessages WHERE COALESCE(tisdeleted, false) = false) as total_messages,
          (SELECT COUNT(DISTINCT cf.dmessageid) FROM tblchatflags cf 
           WHERE cf.dstatus = 'pending' OR cf.dstatus = 'reviewed') as flagged_messages,
          (SELECT COUNT(*) FROM tblmessages WHERE COALESCE(tisdeleted, false) = true) as deleted_messages,
          (SELECT COUNT(*) FROM tblconversations WHERE dtype = 'direct') as direct_chats,
          (SELECT COUNT(*) FROM tblconversations WHERE dtype = 'group') as group_chats
      `);
      
      return stats.rows[0];
    } catch (error) {
      console.error('Error fetching chat statistics:', error);
      throw error;
    }
  }
}

module.exports = AdminChatModel;