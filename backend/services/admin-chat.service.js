const AdminChatModel = require('../model/admin-chat.model');
const { BadRequestError, NotFoundError } = require('../utils/errors');

class AdminChatService {
  static async getAllConversations({ page = 1, limit = 50, type = 'all', search = '', status = 'active' } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const conversations = await AdminChatModel.getAllConversations({
        limit: parseInt(limit),
        offset: parseInt(offset),
        type: type === 'all' ? null : type,
        search: search?.trim() || null,
        status
      });
      
      return {
        data: conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: conversations.length, // In a real app, you'd get total count separately
          hasMore: conversations.length === parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error in AdminChatService.getAllConversations:', error);
      throw error;
    }
  }

  static async getAllMessages({ page = 1, limit = 100, type = 'all', search = '', flagged = null } = {}) {
    try {
      const offset = (page - 1) * limit;
      
      const messages = await AdminChatModel.getAllMessages({
        limit: parseInt(limit),
        offset: parseInt(offset),
        type: type === 'all' ? null : type,
        search: search?.trim() || null,
        flagged
      });
      
      return {
        data: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: messages.length, // In a real app, you'd get total count separately
          hasMore: messages.length === parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error in AdminChatService.getAllMessages:', error);
      throw error;
    }
  }

  static async getFlaggedMessages({ page = 1, limit = 50, type = 'all', search = '' } = {}) {
    try {
      return await this.getAllMessages({
        page,
        limit,
        type,
        search,
        flagged: true
      });
    } catch (error) {
      console.error('Error in AdminChatService.getFlaggedMessages:', error);
      throw error;
    }
  }

  static async getArchivedConversations({ page = 1, limit = 50, type = 'all', search = '' } = {}) {
    try {
      return await this.getAllConversations({
        page,
        limit,
        type,
        search,
        status: 'archived'
      });
    } catch (error) {
      console.error('Error in AdminChatService.getArchivedConversations:', error);
      throw error;
    }
  }

  static async flagMessage(messageId, { flagType, flagReason }, adminUserId) {
    try {
      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      if (!flagType || !flagReason) {
        throw new BadRequestError('Flag type and reason are required');
      }

      if (!adminUserId) {
        throw new BadRequestError('Admin user ID is required');
      }

      const flaggedMessage = await AdminChatModel.flagMessage(messageId, flagType, flagReason, adminUserId);
      
      return {
        success: true,
        message: 'Message flagged successfully',
        data: flaggedMessage
      };
    } catch (error) {
      console.error('Error in AdminChatService.flagMessage:', error);
      throw error;
    }
  }

  static async unflagMessage(messageId, adminUserId) {
    try {
      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      if (!adminUserId) {
        throw new BadRequestError('Admin user ID is required');
      }

      const unflaggedMessage = await AdminChatModel.unflagMessage(messageId, adminUserId);
      
      return {
        success: true,
        message: 'Message unflagged successfully',
        data: unflaggedMessage
      };
    } catch (error) {
      console.error('Error in AdminChatService.unflagMessage:', error);
      throw error;
    }
  }

  static async deleteMessage(messageId) {
    try {
      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      const deletedMessage = await AdminChatModel.deleteMessage(messageId);
      
      return {
        success: true,
        message: 'Message deleted successfully',
        data: deletedMessage
      };
    } catch (error) {
      console.error('Error in AdminChatService.deleteMessage:', error);
      throw error;
    }
  }

  static async archiveConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new BadRequestError('Conversation ID is required');
      }

      const archivedConversation = await AdminChatModel.archiveConversation(conversationId);
      
      return {
        success: true,
        message: 'Conversation archived successfully',
        data: archivedConversation
      };
    } catch (error) {
      console.error('Error in AdminChatService.archiveConversation:', error);
      throw error;
    }
  }

  static async unarchiveConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new BadRequestError('Conversation ID is required');
      }

      const unarchivedConversation = await AdminChatModel.unarchiveConversation(conversationId);
      
      return {
        success: true,
        message: 'Conversation restored successfully',
        data: unarchivedConversation
      };
    } catch (error) {
      console.error('Error in AdminChatService.unarchiveConversation:', error);
      throw error;
    }
  }

  static async getConversationWithMessages(conversationId) {
    try {
      if (!conversationId) {
        throw new BadRequestError('Conversation ID is required');
      }

      const conversation = await AdminChatModel.getConversationWithMessages(conversationId);
      
      return {
        success: true,
        data: conversation
      };
    } catch (error) {
      console.error('Error in AdminChatService.getConversationWithMessages:', error);
      throw error;
    }
  }

  static async getChatStatistics() {
    try {
      const stats = await AdminChatModel.getChatStatistics();
      
      return {
        success: true,
        data: {
          conversations: {
            active: parseInt(stats.active_conversations) || 0,
            archived: parseInt(stats.archived_conversations) || 0,
            direct: parseInt(stats.direct_chats) || 0,
            group: parseInt(stats.group_chats) || 0
          },
          messages: {
            total: parseInt(stats.total_messages) || 0,
            flagged: parseInt(stats.flagged_messages) || 0,
            deleted: parseInt(stats.deleted_messages) || 0
          }
        }
      };
    } catch (error) {
      console.error('Error in AdminChatService.getChatStatistics:', error);
      throw error;
    }
  }

  static async getMessageById(messageId) {
    try {
      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      const messages = await AdminChatModel.getAllMessages({
        limit: 1,
        offset: 0
      });
      
      const message = messages.find(m => m.id === messageId);
      
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      return {
        success: true,
        data: message
      };
    } catch (error) {
      console.error('Error in AdminChatService.getMessageById:', error);
      throw error;
    }
  }
}

module.exports = AdminChatService;