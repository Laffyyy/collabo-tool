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
    const { dconversationId, dsenderId, dcontent, dmessageType } = req.body;
    
    // First, verify the sender ID matches the authenticated user
    const authenticatedUserId = req.user.id;
    
    if (dsenderId !== authenticatedUserId) {
      return res.status(403).json({ 
        message: 'You can only send messages as yourself'
      });
    }
    
    if (!dconversationId || !dsenderId || !dcontent) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors: [
          { type: 'field', msg: 'Invalid value', path: 'dconversationId', location: 'body' },
          { type: 'field', msg: 'Invalid value', path: 'dsenderId', location: 'body' },
          { type: 'field', msg: 'Invalid value', path: 'dcontent', location: 'body' }
        ]
      });
    }
    
    const message = await chatService.addMessage({
      dconversationId,
      dsenderId,
      dcontent,
      dmessageType: dmessageType || 'text'
    });
    
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

exports.getMessagesByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }
    
    const messages = await chatService.getMessagesByConversation(conversationId);
    return res.json(messages);
  } catch (err) {
    return next(err);
  }
};

// In chat.controller.js
exports.addMessage = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('User from token:', req.user);
    
    const { dconversationId, dsenderId, dcontent, dmessageType } = req.body;
    
    console.log('Extracted fields:', { dconversationId, dsenderId, dcontent, dmessageType });
    
    if (!dconversationId || !dsenderId || !dcontent) {
      console.log('Missing fields detected');
      
      // Create detailed error for debugging
      const errors = [];
      if (!dconversationId) errors.push({ type: 'field', msg: 'Missing conversationId', path: 'dconversationId', location: 'body' });
      if (!dsenderId) errors.push({ type: 'field', msg: 'Missing senderId', path: 'dsenderId', location: 'body' });
      if (!dcontent) errors.push({ type: 'field', msg: 'Missing content', path: 'dcontent', location: 'body' });
      
      return res.status(400).json({ 
        message: 'Missing required fields',
        errors
      });
    }
    
    const message = await chatService.addMessage({
      dconversationId,
      dsenderId,
      dcontent,
      dmessageType: dmessageType || 'text'
    });
    
    return res.status(201).json(message);
  } catch (err) {
    console.error('Error adding message:', err);
    return next(err);
  }
};