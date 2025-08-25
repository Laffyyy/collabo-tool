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
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// Helper function for making authenticated requests
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

  /**
   * Get user's broadcasts
   */
  async getMyBroadcasts(filters: BroadcastFilters = {}): Promise<BroadcastResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const url = `${this.baseUrl}/my-broadcasts${params.toString() ? `?${params}` : ''}`;
    console.log('🚀 Making request to:', url); // Debug log
    
    try {
      const response = await makeAuthenticatedRequest(url);
      console.log('📡 Response status:', response.status); // Debug log

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
      console.log('✅ API Response:', result); // Debug log
      console.log('📊 Broadcasts count:', result.broadcasts?.length); // Debug log
      return result;
    } catch (error) {
      console.error('❌ API Error:', error); // Debug log
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }
}

export const broadcastAPI = new BroadcastAPI();