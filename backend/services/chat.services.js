const ChatModel = require('../model/chat.model');  // Note the capital C in ChatModel
const { BadRequestError } = require('../utils/errors');

exports.createConversation = async ({ dname, dtype, dcreatedBy }) => {
  console.log('Creating conversation with:', { dname, dtype, dcreatedBy });
  
  if (!dname || !dtype || !dcreatedBy) throw new BadRequestError('Missing fields');
  
  try {
    const conversation = await ChatModel.createConversation({ dname, dtype, dcreatedBy });
    console.log('Created conversation:', conversation);
    
    // Also add the creator as a member
    await ChatModel.addMember(conversation.did, dcreatedBy);
    console.log('Added creator as member to conversation:', conversation.did);
    
    return conversation;
  } catch (err) {
    console.error('Error creating conversation:', err);
    throw err;
  }
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
  if (!userId) throw new Error('User ID is required');
  
  console.log('Fetching conversations for user:', userId); // Debug log
  
  try {
    const conversations = await ChatModel.getUserConversations(userId);
    console.log('Found conversations:', conversations.length); // Debug log
    return conversations;
  } catch (err) {
    console.error('Error fetching conversations:', err);
    throw err;
  }
};

exports.addMemberToConversation = async (conversationId, userId) => {
  return await ChatModel.addMember(conversationId, userId);
};