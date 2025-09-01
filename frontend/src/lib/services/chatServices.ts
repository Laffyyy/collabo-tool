const API_URL = "http://localhost:5000/api/chat";


export async function createConversation({
  dname,
  dtype,
  dcreatedBy
}: {
  dname: string,
  dtype: string,
  dcreatedBy: string
}) {
  const token = localStorage.getItem('jwt');
  
  console.log('Creating conversation with:', { dname, dtype, dcreatedBy });

  const response = await fetch('http://localhost:5000/api/chat/conversations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ dname, dtype, dcreatedBy })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error creating conversation:', error);
    throw new Error(error);
  }

  return await response.json();
}

export async function getConversations() {
  const token = localStorage.getItem('jwt');
  
  try {
    const response = await fetch('http://localhost:5000/api/chat/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Conversation fetch error:', errorText);
      throw new Error('Failed to fetch conversations');
    }
    
    const data = await response.json();
    console.log('Conversations from server:', data);
    
    // Transform the data to match your UI format
    return data.map((conv: any) => ({
      id: conv.did || conv.id,
      name: conv.dname || 'Unnamed Conversation',
      type: conv.dtype || 'group',
      lastMessage: 'No messages yet',
      lastMessageTime: conv.tcreatedat || new Date(),
      unreadCount: 0,
      isRead: true,
      avatar: '/placeholder.svg',
      isOnline: false,
      messages: [],
      members: []
    }));
  } catch (error) {
    console.error('Error in getConversations:', error);
    return []; // Return empty array to prevent UI errors
  }
}

// In chatServices.ts
export async function sendMessage(conversationId: string, content: string, messageType: string = 'text') {
  const token = localStorage.getItem('jwt');
  const userId = localStorage.getItem('auth_userId');
  
  try {
    const response = await fetch('http://localhost:5000/api/chat/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        dconversationId: conversationId,
        dsenderId: userId,
        dcontent: content,
        dmessageType: messageType
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending message:', errorText);
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
}

export async function getAllUsers() {
  const token = localStorage.getItem('jwt');
  const response = await fetch('http://localhost:5000/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include' // <-- This is required to send cookies!
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return await response.json();
}

// Add this new function
export async function addMemberToConversation({
  conversationId,
  userId
}: {
  conversationId: string,
  userId: string
}) {
  const token = localStorage.getItem('jwt');
  console.log('Adding member:', { conversationId, userId });
  
  try {
    const response = await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error adding member:', errorText);
      throw new Error(errorText);
    }

    const data = await response.json();
    console.log('Member added successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in addMemberToConversation:', error);
    throw error;
  }
}

export async function getMessagesForConversation(conversationId: string) {
  const token = localStorage.getItem('jwt');
  
  try {
    const response = await fetch(`http://localhost:5000/api/chat/messages/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Messages fetch error:', errorText);
      throw new Error('Failed to fetch messages');
    }
    
    const data = await response.json();
    console.log('Raw messages from server:', data);
    
    // Transform the data to match your UI Message format
    return data.map((msg: any) => ({
      id: msg.did || msg.id || `temp-${Date.now()}-${Math.random()}`,
      senderId: msg.dsenderid || "unknown",
      senderName: msg.dusername || 'Unknown User',
      senderDepartment: 'Department',
      senderRole: 'Role',
      content: msg.dcontent || msg.content || "",
      timestamp: msg.tcreatedat || msg.timestamp || new Date(),
      type: msg.dmessagetype || msg.type || 'text',
      reactions: []
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    return []; // Return empty array to prevent UI errors
  }
}
// In chatServices.ts
export async function sendMessageToApi(conversationId: string, content: string, messageType: string = 'text') {
  const token = localStorage.getItem('jwt');
  
  // Try to get user ID from various sources
  let userId = localStorage.getItem('auth_userId') || 
               localStorage.getItem('userId');
               
  // Try to extract from auth_user if needed
  if (!userId) {
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id || user.did || user._id || user.userId;
      } catch (e) {
        console.error('Failed to parse user object:', e);
      }
    }
  }
  
  // If still no user ID, use a fallback (temporary solution)
  if (!userId) {
    console.warn('Using hardcoded user ID as fallback!');
    userId = "327404ce-d1dd-4a93-a108-dfa5a415a734"; // Fallback, but will log a warning
  }
  
  console.log('Sending message with:', {
    conversationId,
    senderId: userId,
    content,
    messageType
  });
  
  try {
    const response = await fetch('http://localhost:5000/api/chat/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        dconversationId: conversationId,
        dsenderId: userId,
        dcontent: content,
        dmessageType: messageType
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error sending message:', errorText);
      throw new Error('Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in sendMessageToApi:', error);
    throw error;
  }
}

export async function markMessageAsRead(messageId: string) {
  const token = localStorage.getItem('jwt');
  
  try {
    const response = await fetch(`http://localhost:5000/api/chat/messages/${messageId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error marking message as read:', errorText);
      throw new Error('Failed to mark message as read');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in markMessageAsRead:', error);
    throw error;
  }
}