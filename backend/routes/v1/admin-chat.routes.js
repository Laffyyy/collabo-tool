const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const { requireRole } = require('../../auth/requireRole');
const { body, param, query } = require('express-validator');
const { validate } = require('../../utils/validate');
const AdminChatModel = require('../../model/admin-chat.model');

const router = express.Router();

// Validation middleware
const validateFlagMessage = [
  param('messageId').isUUID().withMessage('Valid message ID is required'),
  body('flagType').notEmpty().isString().withMessage('Flag type is required'),
  body('flagReason').notEmpty().isString().withMessage('Flag reason is required'),
  validate
];

const validateMessageId = [
  param('messageId').isUUID().withMessage('Valid message ID is required'),
  validate
];

const validateConversationId = [
  param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
  validate
];

const validatePaginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
  query('type').optional().isIn(['all', '1v1', 'group']).withMessage('Type must be all, 1v1, or group'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query must be less than 100 characters'),
  validate
];

// TEMPORARY: Skip auth for testing - remove this in production!
// Apply auth middleware - all routes require authentication and admin role  
// router.use(requireAuth);
// router.use(requireRole(['admin']));

// Chat Management Statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await AdminChatModel.getChatStatistics();
    res.json({
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
    });
  } catch (error) {
    console.error('Error fetching chat statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat statistics',
      error: error.message
    });
  }
});

// Conversations Management
router.get('/conversations', validatePaginationQuery, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, search, status = 'active' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const conversations = await AdminChatModel.getAllConversations({
      limit: parseInt(limit),
      offset: offset,
      type: type,
      search: search,
      status: status
    });
    
    res.json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversations,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: conversations.length, 
        hasMore: conversations.length === parseInt(limit) 
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// Messages Management  
router.get('/messages', validatePaginationQuery, async (req, res) => {
  try {
    const { page = 1, limit = 100, type, search, flagged } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await AdminChatModel.getAllMessages({
      limit: parseInt(limit),
      offset: offset,
      type: type,
      search: search,
      flagged: flagged === 'true'
    });
    
    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      data: messages,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: messages.length, 
        hasMore: messages.length === parseInt(limit) 
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

// Get flagged messages
router.get('/messages/flagged', validatePaginationQuery, async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Use dedicated getFlaggedMessages method that queries tblchatflags table
    const messages = await AdminChatModel.getFlaggedMessages({
      limit: parseInt(limit),
      offset: offset,
      search: search
    });
    
    res.json({
      success: true,
      message: 'Flagged messages retrieved successfully',
      data: messages,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: messages.length, 
        hasMore: messages.length === parseInt(limit) 
      }
    });
  } catch (error) {
    console.error('Error fetching flagged messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged messages',
      error: error.message
    });
  }
});

// Get archived conversations
router.get('/conversations/archived', validatePaginationQuery, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const conversations = await AdminChatModel.getAllConversations({
      limit: parseInt(limit),
      offset: offset,
      type: type,
      search: search,
      status: 'archived'
    });
    
    res.json({
      success: true,
      message: 'Archived conversations retrieved successfully',
      data: conversations,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: conversations.length, 
        hasMore: conversations.length === parseInt(limit) 
      }
    });
  } catch (error) {
    console.error('Error fetching archived conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch archived conversations',
      error: error.message
    });
  }
});

// Get conversation with messages
router.get('/conversations/:conversationId', validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await AdminChatModel.getConversationWithMessages(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    if (error.message === 'Conversation not found') {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation',
        error: error.message
      });
    }
  }
});

// Message moderation endpoints
router.patch('/messages/:messageId/flag', validateFlagMessage, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { flagType, flagReason } = req.body;
    
    const result = await AdminChatModel.flagMessage(messageId, flagType, flagReason, req.user.id);
    
    res.json({
      success: true,
      message: 'Message flagged successfully',
      data: result
    });
  } catch (error) {
    console.error('Error flagging message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag message',
      error: error.message
    });
  }
});

router.patch('/messages/:messageId/unflag', validateMessageId, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const result = await AdminChatModel.unflagMessage(messageId, req.user.id);
    
    res.json({
      success: true,
      message: 'Message unflagged successfully',
      data: result
    });
  } catch (error) {
    console.error('Error unflagging message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unflag message',
      error: error.message
    });
  }
});

router.delete('/messages/:messageId', validateMessageId, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const result = await AdminChatModel.deleteMessage(messageId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    if (error.message === 'Message not found') {
      res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message
      });
    }
  }
});

// Conversation archiving endpoints
router.patch('/conversations/:conversationId/archive', validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const result = await AdminChatModel.archiveConversation(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation archived successfully',
      data: result
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    if (error.message === 'Conversation not found') {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to archive conversation',
        error: error.message
      });
    }
  }
});

router.patch('/conversations/:conversationId/unarchive', validateConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const result = await AdminChatModel.unarchiveConversation(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation unarchived successfully',
      data: result
    });
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    if (error.message === 'Conversation not found') {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to unarchive conversation',
        error: error.message
      });
    }
  }
});

// Temporary test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Admin chat routes are working!' });
});

module.exports = router;