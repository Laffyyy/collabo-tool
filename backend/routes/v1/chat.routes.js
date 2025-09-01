const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const { body } = require('express-validator');
const { validateCreateConversation } = require('../../utils/validate');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

const validateAddMessage = [
  body('dconversationId').exists().isUUID(),
  body('dsenderId').exists().isUUID(),
  body('dcontent').exists().isString(),
  body('dmessageType').optional().isString(),
];

// Apply requireAuth to all routes in this router
router.use(requireAuth);

// Create conversation
router.post('/conversations', validateCreateConversation, chatController.createConversation);

// Add message
router.post('/messages', validateAddMessage, chatController.addMessage);

// Fetch messages for a conversation
router.get('/messages/:conversationId', chatController.getMessagesByConversation);

// Get user conversations
router.get('/conversations', chatController.getUserConversations);

// Add member to conversation
router.post('/conversations/:conversationId/members', chatController.addMember);

module.exports = router;