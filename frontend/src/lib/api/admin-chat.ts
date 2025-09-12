import { API_BASE_URL } from './config';

// Chat Management API Client
export class AdminChatAPI {
  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/chat${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get chat statistics
  static async getChatStatistics() {
    return this.request('/statistics');
  }

  // Conversations Management
  static async getAllConversations(params: {
    page?: number;
    limit?: number;
    type?: 'all' | '1v1' | 'group';
    search?: string;
    status?: 'active' | 'archived';
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/conversations${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  static async getArchivedConversations(params: {
    page?: number;
    limit?: number;
    type?: 'all' | '1v1' | 'group';
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    // Add status=archived to get archived conversations
    queryParams.append('status', 'archived');
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/conversations${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  static async getConversationWithMessages(conversationId: string) {
    return this.request(`/conversations/${conversationId}`);
  }

  static async archiveConversation(conversationId: string) {
    return this.request(`/conversations/${conversationId}/archive`, {
      method: 'PATCH',
    });
  }

  static async unarchiveConversation(conversationId: string) {
    return this.request(`/conversations/${conversationId}/unarchive`, {
      method: 'PATCH',
    });
  }

  // Messages Management
  static async getAllMessages(params: {
    page?: number;
    limit?: number;
    type?: 'all' | '1v1' | 'group';
    search?: string;
    flagged?: boolean;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/messages${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  static async getFlaggedMessages(params: {
    page?: number;
    limit?: number;
    type?: 'all' | '1v1' | 'group';
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    // Add flagged=true to get flagged messages
    queryParams.append('flagged', 'true');
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/messages${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  static async getMessageById(messageId: string) {
    return this.request(`/messages/${messageId}`);
  }

  // Message Moderation
  static async flagMessage(messageId: string, flagType: string, flagReason: string) {
    return this.request(`/messages/${messageId}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ flagType, flagReason }),
    });
  }

  static async unflagMessage(messageId: string) {
    return this.request(`/messages/${messageId}/unflag`, {
      method: 'PATCH',
    });
  }

  static async deleteMessage(messageId: string) {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  }
}