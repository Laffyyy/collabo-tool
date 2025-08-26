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
  const userId = localStorage.getItem('auth_userId');
  
  console.log('Fetching conversations with token:', !!token);
  console.log('User ID from storage:', userId);
  
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
    console.log('Conversations fetched successfully:', data.length);
    
    // Transform data into the expected format
    return data.map((conv: any) => ({
      id: conv.did || conv.id,
      name: conv.dname || 'Unnamed Chat',
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
    return []; // Return empty array instead of throwing to prevent app crash
  }
}

export async function sendMessage({
  dconversationId,
  dsenderId,
  dcontent,
  dmessageType = 'text'
}: {
  dconversationId: string,
  dsenderId: string,
  dcontent: string,
  dmessageType?: string
}) {
  const token = localStorage.getItem('jwt');
  const response = await fetch(`${API_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      dconversationId,
      dsenderId,
      dcontent,
      dmessageType
    })
  });
  if (!response.ok) throw new Error("Failed to send message");
  return await response.json();
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