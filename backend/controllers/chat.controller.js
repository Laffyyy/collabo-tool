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

exports.addMessage = async (req, res, next) => {
  try {
    const message = await chatService.addMessage(req.body);
    return res.json(message); // Add return
  } catch (err) {
    return next(err); // Add return
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