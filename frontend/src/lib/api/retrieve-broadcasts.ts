import { API_CONFIG } from './config';

export interface BroadcastFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  includeDeleted?: boolean;
}

export interface BroadcastResponse {
  success: boolean;
  broadcasts: any[];
  statistics: {
    total: number;
    active: number;
    acknowledged: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
    byStatus: {
      sent: number;
      scheduled: number;
      draft: number;
      archived: number;
      deleted: number;
    };
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

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

class BroadcastAPI {
  private baseUrl = `${API_CONFIG.baseUrl}/api/v1/broadcasts`;

  async getMyBroadcasts(filters: BroadcastFilters = {}): Promise<BroadcastResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/my-broadcasts${params.toString() ? `?${params}` : ''}`;
    console.log('🚀 Fetching broadcasts from:', url);
    
    try {
      const response = await makeAuthenticatedRequest(url);
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ API Response:', result);
      return result;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error instanceof Error ? error : new Error('Network error occurred');
    }
  }

  async getBroadcastById(id: string): Promise<{ success: boolean; broadcast: any }> {
    const url = `${this.baseUrl}/my-broadcasts/${id}`;
    
    try {
      const response = await makeAuthenticatedRequest(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching broadcast:', error);
      throw error;
    }
  }

  async getBroadcastStats(): Promise<{ success: boolean; statistics: any }> {
    const url = `${this.baseUrl}/my-broadcasts/stats`;
    
    try {
      const response = await makeAuthenticatedRequest(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching broadcast stats:', error);
      throw error;
    }
  }

  /**
   * Update broadcast status
   */
  async updateBroadcastStatus(broadcastId: string, status: string): Promise<{ success: boolean; broadcast: any; message: string }> {
    const url = `${this.baseUrl}/my-broadcasts/${broadcastId}/status`;
    
    try {
      const response = await makeAuthenticatedRequest(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error updating broadcast status:', error);
      throw error;
    }
  }

  /**
   * Mark broadcast as done
   */
  async markBroadcastAsDone(broadcastId: string): Promise<{ success: boolean; broadcast: any; message: string }> {
    const url = `${this.baseUrl}/my-broadcasts/${broadcastId}/mark-done`;
    
    try {
      const response = await makeAuthenticatedRequest(url, {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error marking broadcast as done:', error);
      throw error;
    }
  }
  
}

export const broadcastAPI = new BroadcastAPI();