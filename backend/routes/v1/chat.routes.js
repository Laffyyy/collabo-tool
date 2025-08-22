const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const {
  validateCreateConversation,
  validateAddMessage
} = require('../../utils/validate');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

router.use(requireAuth);

// Create conversation
router.post('/conversations', validateCreateConversation, chatController.createConversation);

// Add message
router.post('/messages', validateAddMessage, chatController.addMessage);

// Fetch messages for a conversation
router.get('/messages/:conversationId', chatController.getMessagesByConversation);

module.exports = router;