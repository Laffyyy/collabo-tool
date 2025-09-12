const chatService = require('../services/chat.services');
const { BadRequestError } = require('../utils/errors');

exports.createConversation = async (req, res, next) => {
  try {
    const conversation = await chatService.createConversation(req.body);
    return res.json(conversation); // Add return
  } catch (err) {
    return next(err); // Add return
  }
};

exports.findOrCreateDirectConversation = async (req, res, next) => {
  try {
    const { targetUserId, targetUserName } = req.body;
    const currentUserId = req.user?.id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!targetUserId || !targetUserName) {
      return res.status(400).json({ message: 'Missing target user information' });
    }
    
    const result = await chatService.findOrCreateDirectConversation({
      userId1: currentUserId,
      userId2: targetUserId,
      userName1: req.user.username || 'User',
      userName2: targetUserName
    });
    
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

exports.checkExistingDirectConversation = async (req, res, next) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user?.id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Missing target user ID' });
    }
    
    const existingConversation = await chatService.checkExistingDirectConversation({
      userId1: currentUserId,
      userId2: targetUserId
    });
    
    if (existingConversation) {
      return res.json(existingConversation);
    } else {
      return res.status(404).json({ message: 'No existing conversation found' });
    }
  } catch (err) {
    return next(err);
  }
};

exports.addMessage = async (req, res, next) => {
  try {
    const { dconversationId, dsenderId, dcontent, dreplyToId, dreplyToSenderId, dreplyToContent, dattachment, dmessageType } = req.body;
    
    console.log('Request body:', req.body);
    
    // First, verify the sender ID matches the authenticated user
    const authenticatedUserId = req.user.id;
    
    if (dsenderId !== authenticatedUserId) {
      return res.status(403).json({ 
        message: 'You can only send messages as yourself'
      });
    }
    
    if (!dconversationId || !dsenderId) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          { type: 'field', msg: 'Missing conversationId', path: 'dconversationId', location: 'body' },
          { type: 'field', msg: 'Missing senderId', path: 'dsenderId', location: 'body' }
        ]
      });
    }
    
    // Allow empty content only if attachment is present
    if (!dcontent && !dattachment) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          { type: 'field', msg: 'Missing content', path: 'dcontent', location: 'body' }
        ]
      });
    }
    
    // Create message data - TEMPORARILY IGNORE ATTACHMENTS
    const messageData = {
      dconversationId,
      dsenderId,
      dcontent: dcontent || ' ', // Use space if content is empty but attachment exists
      dmessageType: dmessageType || 'text'
    };
    
    // Add reply fields if provided
    if (dreplyToId) {
      messageData.dreplyToId = dreplyToId;
      messageData.dreplyToSenderId = dreplyToSenderId;
      messageData.dreplyToContent = dreplyToContent;
    }
    
    // TEMPORARILY SKIP ATTACHMENT HANDLING
    // if (dattachment) {
    //   messageData.dattachment = dattachment;
    // }
    if (dattachment) {
      console.log('Attachment received but temporarily ignored due to database schema');
    }
    
    const message = await chatService.addMessage(messageData);
    
    return res.status(201).json(message);
  } catch (err) {
    console.error('Error adding message:', err);
    return next(err);
  }
};

exports.getMessagesByConversation = async (req, res, next) => {
  try {
    const messages = await chatService.getMessagesByConversation(req.params.conversationId);
    return res.json(messages); // Add return
  } catch (err) {
    return next(err); // Add return
  }
};

exports.getUserConversations = async (req, res, next) => {
  // Add a guard to prevent multiple responses
  let responded = false;
  
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      responded = true;
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const conversations = await chatService.getUserConversations(userId);
    
    if (!responded) {
      responded = true;
      return res.json(conversations);
    }
  } catch (err) {
    if (!responded) {
      responded = true;
      return next(err);
    }
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    
    if (!conversationId || !userId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const result = await chatService.addMemberToConversation(conversationId, userId);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

/**
 * Update conversation settings
 */
exports.updateConversationSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, settings } = req.body;

    // Validate conversation ownership/permissions
    const conversation = await chatService.getConversationById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a member of this conversation
    const isMember = await chatService.isUserInConversation(id, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    // Update the conversation
    const updateData = {};
    if (name) {
      updateData.dname = name;
    }
    
    if (settings) {
      updateData.dsettings = JSON.stringify(settings);
    }

    const updatedConversation = await chatService.updateConversation(id, updateData);

    return res.json({ 
      success: true, 
      conversation: updatedConversation 
    });
  } catch (error) {
    console.error('Error updating conversation settings:', error);
    return next(error);
  }
};

/**
 * Update conversation photo
 */
exports.updateConversationPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate conversation ownership/permissions
    const conversation = await chatService.getConversationById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a member of this conversation
    const isMember = await chatService.isUserInConversation(id, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    // Process the file (e.g., upload to cloud storage, save path to DB)
    const photoUrl = `/uploads/${req.file.filename}`; // Adjust based on your storage solution
    
    // Update conversation with new photo URL
    await chatService.updateConversation(id, { 
      dphotourl: photoUrl 
    });

    return res.json({ 
      success: true, 
      photoUrl 
    });
  } catch (error) {
    console.error('Error updating conversation photo:', error);
    return next(error);
  }
};

/**
 * Archive conversation
 */
exports.archiveConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Validate conversation ownership/permissions
    const conversation = await chatService.getConversationById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a member of this conversation
    const isMember = await chatService.isUserInConversation(id, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    // Parse existing settings if any
    let settings = {};
    try {
      settings = JSON.parse(conversation.dsettings || '{}');
    } catch (e) {
      console.error('Error parsing settings:', e);
    }
    
    // Update the settings to mark as archived
    settings.isArchived = true;

    // Update the conversation
    const updatedConversation = await chatService.updateConversation(id, { 
      dsettings: JSON.stringify(settings)
    });

    return res.json({ 
      success: true, 
      conversation: updatedConversation 
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return next(error);
  }
};

/**
 * Update a specific conversation setting
 */
exports.updateConversationSetting = async (req, res, next) => {
  try {
    const { id, settingName } = req.params;
    const { value } = req.body;
    const userId = req.user.id;

    // Validate conversation ownership/permissions
    const conversation = await chatService.getConversationById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a member of this conversation
    const isMember = await chatService.isUserInConversation(id, userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this conversation' });
    }

    // Get current settings
    let settings = {};
    try {
      settings = JSON.parse(conversation.dsettings || '{}');
    } catch (e) {
      console.error('Error parsing settings:', e);
    }

    // Update the specific setting
    settings[settingName] = value;

    // Save updated settings
    const updatedConversation = await chatService.updateConversation(id, { 
      dsettings: JSON.stringify(settings)
    });

    return res.json({ 
      success: true, 
      conversation: updatedConversation,
      settings
    });
  } catch (error) {
    console.error(`Error updating ${req.params.settingName} setting:`, error);
    return next(error);
  }
};

// Add a reaction to a message
exports.addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    console.log('🎯 Adding reaction:', { messageId, emoji, userId });

    // Basic validation
    if (!emoji || emoji.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    // For now, return success - we'll implement database integration later
    return res.json({
      success: true,
      message: 'Reaction added successfully',
      reaction: {
        messageId,
        emoji: emoji.trim(),
        userId,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return next(error);
  }
};

// Remove a reaction from a message
exports.removeReaction = async (req, res, next) => {
  try {
    const { messageId, emoji } = req.params;
    const userId = req.user.id;

    console.log('🎯 Removing reaction:', { messageId, emoji, userId });

    // For now, return success - we'll implement database integration later
    return res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return next(error);
  }
};

// Get all reactions for a message
exports.getMessageReactions = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    console.log('🎯 Getting reactions for message:', messageId);

    // For now, return empty array - we'll implement database integration later
    return res.json({
      success: true,
      reactions: []
    });
  } catch (error) {
    console.error('Error getting message reactions:', error);
    return next(error);
  }
};