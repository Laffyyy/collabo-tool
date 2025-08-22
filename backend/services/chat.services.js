const chatModel = require('../model/chat.model');
const { BadRequestError } = require('../utils/errors');

exports.createConversation = async ({ dname, dtype, dcreatedBy }) => {
  if (!dname || !dtype || !dcreatedBy) throw new BadRequestError('Missing fields');
  return await chatModel.createConversation({ dname, dtype, dcreatedBy });
};

exports.addMessage = async ({ dconversationId, dsenderId, dcontent, dmessageType }) => {
  if (!dconversationId || !dsenderId || !dcontent) throw new BadRequestError('Missing fields');
  return await chatModel.addMessage({ dconversationId, dsenderId, dcontent, dmessageType });
};

exports.getMessagesByConversation = async (conversationId) => {
  if (!conversationId) throw new BadRequestError('Missing conversationId');
  return await chatModel.getMessagesByConversation(conversationId);
};