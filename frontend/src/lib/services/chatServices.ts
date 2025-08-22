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
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ dname, dtype, dcreatedBy })
  });

  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

export async function getConversations() {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
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