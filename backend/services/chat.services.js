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

exports.findOrCreateDirectConversation = async ({ userId1, userId2, userName1, userName2 }) => {
  console.log('Finding or creating direct conversation between:', userId1, 'and', userId2);
  
  if (!userId1 || !userId2) throw new BadRequestError('Missing user IDs');
  
  try {
    // Check if a direct conversation already exists between these users
    const existingConversation = await ChatModel.findExistingDirectConversation(userId1, userId2);
    
    if (existingConversation) {
      console.log('Found existing conversation:', existingConversation);
      return { conversation: existingConversation, isNew: false };
    }
    
    // Create new conversation if none exists
    // For direct conversations, we'll let the frontend handle the display name
    // Store a generic name that can be overridden by frontend logic
    const conversationName = `${userName1}_${userName2}_direct`;
    const newConversation = await ChatModel.createConversation({
      dname: conversationName,
      dtype: 'direct',
      dcreatedBy: userId1
    });
    
    // Add both users as members
    await ChatModel.addMember(newConversation.did, userId1);
    await ChatModel.addMember(newConversation.did, userId2);
    
    console.log('Created new direct conversation:', newConversation);
    return { conversation: newConversation, isNew: true };
  } catch (err) {
    console.error('Error finding/creating conversation:', err);
    throw err;
  }
};

exports.checkExistingDirectConversation = async ({ userId1, userId2 }) => {
  console.log('Checking for existing direct conversation between:', userId1, 'and', userId2);
  
  if (!userId1 || !userId2) throw new BadRequestError('Missing user IDs');
  
  try {
    // Check if a direct conversation already exists between these users
    const existingConversation = await ChatModel.findExistingDirectConversation(userId1, userId2);
    
    if (existingConversation) {
      console.log('Found existing conversation:', existingConversation);
      return existingConversation;
    }
    
    return null; // No existing conversation found
  } catch (err) {
    console.error('Error checking for existing conversation:', err);
    throw err;
  }
};

exports.addMessage = async ({ dconversationId, dsenderId, dcontent, dreplyToId, dreplyToSenderId, dreplyToContent, dattachment, dmessageType }) => {
  if (!dconversationId || !dsenderId) throw new BadRequestError('Missing conversation ID or sender ID');
  
  // Allow empty content only if attachment is present
  if (!dcontent && !dattachment) throw new BadRequestError('Missing content or attachment');
  
  // Pass attachment data to the model
  return await ChatModel.addMessage({ 
    dconversationId, 
    dsenderId, 
    dcontent, 
    dmessageType,
    dreplyToId, 
    dreplyToSenderId, 
    dreplyToContent,
    dattachment  // Now include attachment data
  });
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

/**
 * Get conversation by ID
 */
exports.getConversationById = async (conversationId) => {
  try {
    const result = await ChatModel.getConversationById(conversationId);
    return result;
  } catch (error) {
    console.error('Error in getConversationById service:', error);
    throw error;
  }
};

/**
 * Check if user is in conversation
 */
exports.isUserInConversation = async (conversationId, userId) => {
  try {
    const result = await ChatModel.isUserInConversation(conversationId, userId);
    return result;
  } catch (error) {
    console.error('Error in isUserInConversation service:', error);
    throw error;
  }
};

/**
 * Update conversation details
 */
exports.updateConversation = async (conversationId, updateData) => {
  try {
    const result = await ChatModel.updateConversation(conversationId, updateData);
    return result;
  } catch (error) {
    console.error('Error in updateConversation service:', error);
    throw error;
  }
};