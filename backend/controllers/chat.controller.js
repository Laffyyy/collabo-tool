const chatService = require('../services/chat.services');
const { BadRequestError } = require('../utils/errors');

exports.createConversation = async (req, res, next) => {
  try {
    const conversation = await chatService.createConversation(req.body);
    res.json(conversation);
  } catch (err) {
    next(err);
  }
};

exports.addMessage = async (req, res, next) => {
  try {
    const message = await chatService.addMessage(req.body);
    res.json(message);
  } catch (err) {
    next(err);
  }
};

exports.getMessagesByConversation = async (req, res, next) => {
  try {
    const messages = await chatService.getMessagesByConversation(req.params.conversationId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
};

exports.getUserConversations = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const conversations = await chatService.getUserConversations(userId);
    // Always return an array, even if empty
    res.json(conversations || []);
  } catch (err) {
    next(err);
  }
};