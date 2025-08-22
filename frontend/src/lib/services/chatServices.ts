const API_URL = "http://localhost:5000/api/chat";

export async function createConversation(users: number[], name?: string) {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include", // allows cookies if you need auth
    body: JSON.stringify({
      users,
      name
    })
  });

  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }

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
