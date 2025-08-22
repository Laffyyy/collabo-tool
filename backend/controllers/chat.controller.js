const chatService = require('../services/chat.services');

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