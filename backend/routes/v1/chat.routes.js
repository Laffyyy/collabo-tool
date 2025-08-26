const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const {
  validateCreateConversation,
  validateAddMessage
} = require('../../utils/validate');
const chatController = require('../../controllers/chat.controller');

const router = express.Router();

// Apply requireAuth to all routes in this router
router.use(requireAuth);

// Create conversation
router.post('/conversations', validateCreateConversation, chatController.createConversation);

// Add message
router.post('/messages', validateAddMessage, chatController.addMessage);

// Fetch messages for a conversation
router.get('/messages/:conversationId', chatController.getMessagesByConversation);

// REMOVE THE DUPLICATE requireAuth HERE:
router.get('/conversations', chatController.getUserConversations);
// NOT: router.get('/conversations', requireAuth, chatController.getUserConversations);

router.post('/conversations/:conversationId/members', requireAuth, chatController.addMember);

module.exports = router;