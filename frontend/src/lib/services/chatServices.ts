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

  const response = await fetch(`${API_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dname, dtype, dcreatedBy })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return await response.json();
}

export async function getConversations() {
  const token = localStorage.getItem('jwt');
  const response = await fetch(`${API_URL}/conversations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return await response.json();
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
    }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return await response.json();
}