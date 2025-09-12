const express = require('express');
const { requireAuth } = require('../../auth/requireAuth');
const { body } = require('express-validator');
const { validateCreateConversation } = require('../../utils/validate');
const chatController = require('../../controllers/chat.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Create upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Images Only!'));
    }
  }
});

const router = express.Router();

const validateAddMessage = [
  body('dconversationId').exists().isUUID(),
  body('dsenderId').exists().isUUID(),
  body('dcontent').optional().isString(), // Changed from exists() to optional() to allow attachments without content
  body('dmessageType').optional().isString(),
];

// Apply requireAuth to all routes in this router
router.use(requireAuth);

// Create conversation
router.post('/conversations', validateCreateConversation, chatController.createConversation);

// Find or create direct conversation
router.post('/conversations/direct', chatController.findOrCreateDirectConversation);

// Check for existing direct conversation (without creating)
router.get('/conversations/check-existing/:targetUserId', chatController.checkExistingDirectConversation);

// Add message
router.post('/messages', validateAddMessage, chatController.addMessage);

// Fetch messages for a conversation
router.get('/messages/:conversationId', chatController.getMessagesByConversation);

// Get user conversations
router.get('/conversations', chatController.getUserConversations);

// Add member to conversation
router.post('/conversations/:conversationId/members', chatController.addMember);

// Add these new routes with requireAuth instead of authMiddleware
router.put('/conversations/:id/settings', requireAuth, chatController.updateConversationSettings);
router.post('/conversations/:id/photo', requireAuth, upload.single('photo'), chatController.updateConversationPhoto);
router.put('/conversations/:id/archive', requireAuth, chatController.archiveConversation);
router.put('/conversations/:id/settings/:settingName', requireAuth, chatController.updateConversationSetting);

// Reaction routes
router.post('/messages/:messageId/reactions', [
  body('emoji').exists().isString().isLength({ min: 1, max: 10 })
], chatController.addReaction);

router.delete('/messages/:messageId/reactions/:emoji', chatController.removeReaction);

router.get('/messages/:messageId/reactions', chatController.getMessageReactions);

module.exports = router;