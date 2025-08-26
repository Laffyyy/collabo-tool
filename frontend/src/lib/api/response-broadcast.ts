import { API_CONFIG } from './config';

function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    credentials: 'include'
  });
}

export const responseBroadcastAPI = {
  async submitAcknowledgment(broadcastId: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/acknowledge`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async submitPreferredDate(broadcastId: string, preferredDate: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/preferred-date`,
      {
        method: 'POST',
        body: JSON.stringify({ preferredDate })
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async submitChoice(broadcastId: string, selectedChoice: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/choice`,
      {
        method: 'POST',
        body: JSON.stringify({ selectedChoice })
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async submitTextResponse(broadcastId: string, textResponse: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/text`,
      {
        method: 'POST',
        body: JSON.stringify({ textResponse })
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async getUserResponse(broadcastId: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/my-response`
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  async deleteUserResponse(broadcastId: string) {
    const response = await makeAuthenticatedRequest(
      `${API_CONFIG.baseUrl}/api/v1/broadcast-responses/${broadcastId}/my-response`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
};