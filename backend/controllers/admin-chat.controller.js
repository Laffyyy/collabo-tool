const AdminChatService = require('../services/admin-chat.service');
const { BadRequestError } = require('../utils/errors');

// Get all conversations for admin management
exports.getAllConversations = async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type = 'all', 
        search = '', 
        status = 'active' 
      } = req.query;

      const result = await AdminChatService.getAllConversations({
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        search,
        status
      });

      return res.json({
        success: true,
        message: 'Conversations retrieved successfully',
        ...result
      });
    } catch (error) {
      console.error('Error in AdminChatController.getAllConversations:', error);
      return next(error);
    }
};

// Get all messages for admin management  
exports.getAllMessages = async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 100, 
        type = 'all', 
        search = '', 
        flagged 
      } = req.query;

      const result = await AdminChatService.getAllMessages({
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        search,
        flagged: flagged === 'true' ? true : flagged === 'false' ? false : null
      });

      return res.json({
        success: true,
        message: 'Messages retrieved successfully',
        ...result
      });
    } catch (error) {
      console.error('Error in AdminChatController.getAllMessages:', error);
      return next(error);
    }
};

// Get flagged messages
exports.getFlaggedMessages = async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type = 'all', 
        search = '' 
      } = req.query;

      const result = await AdminChatService.getFlaggedMessages({
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        search
      });

      return res.json({
        success: true,
        message: 'Flagged messages retrieved successfully',
        ...result
      });
    } catch (error) {
      console.error('Error in AdminChatController.getFlaggedMessages:', error);
      return next(error);
    }
};

// Get archived conversations
exports.getArchivedConversations = async (req, res, next) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type = 'all', 
        search = '' 
      } = req.query;

      const result = await AdminChatService.getArchivedConversations({
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        search
      });

      return res.json({
        success: true,
        message: 'Archived conversations retrieved successfully',
        ...result
      });
    } catch (error) {
      console.error('Error in AdminChatController.getArchivedConversations:', error);
      return next(error);
    }
};

// Flag a message
exports.flagMessage = async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const { flagType, flagReason } = req.body;
      const adminUserId = req.user?.id;

      if (!flagType || !flagReason) {
        throw new BadRequestError('Flag type and reason are required');
      }

      if (!adminUserId) {
        throw new BadRequestError('Admin authentication required');
      }

      const result = await AdminChatService.flagMessage(messageId, {
        flagType: flagType.trim(),
        flagReason: flagReason.trim()
      }, adminUserId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.flagMessage:', error);
      return next(error);
    }
};

// Unflag a message
exports.unflagMessage = async (req, res, next) => {
    try {
      const { messageId } = req.params;
      const adminUserId = req.user?.id;

      if (!adminUserId) {
        throw new BadRequestError('Admin authentication required');
      }

      const result = await AdminChatService.unflagMessage(messageId, adminUserId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.unflagMessage:', error);
      return next(error);
    }
};

// Delete a message (soft delete)
exports.deleteMessage = async (req, res, next) => {
    try {
      const { messageId } = req.params;

      const result = await AdminChatService.deleteMessage(messageId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.deleteMessage:', error);
      return next(error);
    }
};

// Archive a conversation
exports.archiveConversation = async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const result = await AdminChatService.archiveConversation(conversationId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.archiveConversation:', error);
      return next(error);
    }
};

// Unarchive (restore) a conversation
exports.unarchiveConversation = async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const result = await AdminChatService.unarchiveConversation(conversationId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.unarchiveConversation:', error);
      return next(error);
    }
};

// Get conversation with all messages
exports.getConversationWithMessages = async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const result = await AdminChatService.getConversationWithMessages(conversationId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.getConversationWithMessages:', error);
      return next(error);
    }
};

// Get chat management statistics
exports.getChatStatistics = async (req, res, next) => {
    try {
      const result = await AdminChatService.getChatStatistics();

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.getChatStatistics:', error);
      return next(error);
    }
};

// Get specific message details
exports.getMessageById = async (req, res, next) => {
    try {
      const { messageId } = req.params;

      const result = await AdminChatService.getMessageById(messageId);

      return res.json(result);
    } catch (error) {
      console.error('Error in AdminChatController.getMessageById:', error);
      return next(error);
    }
};