const ChatModel = require('../model/chat.model');  // Note the capital C in ChatModel
const { BadRequestError } = require('../utils/errors');

exports.createConversation = async ({ dname, dtype, dcreatedBy }) => {
  if (!dname || !dtype || !dcreatedBy) throw new BadRequestError('Missing fields');
  return await ChatModel.createConversation({ dname, dtype, dcreatedBy });
};

exports.addMessage = async ({ dconversationId, dsenderId, dcontent, dmessageType }) => {
  if (!dconversationId || !dsenderId || !dcontent) throw new BadRequestError('Missing fields');
  return await ChatModel.addMessage({ dconversationId, dsenderId, dcontent, dmessageType });
};

exports.getMessagesByConversation = async (conversationId) => {
  if (!conversationId) throw new BadRequestError('Missing conversationId');
  return await ChatModel.getMessagesByConversation(conversationId);
};

exports.getUserConversations = async (userId) => {
  if (!userId) throw new BadRequestError('User ID is required');
  
  try {
    const conversations = await ChatModel.getUserConversations(userId);
    return conversations;
  } catch (error) {
    console.error('Service error:', error);
    throw error;
  }
};