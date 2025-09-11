import { API_CONFIG } from './config';

export interface ReceivedBroadcastFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}

export interface ReceivedBroadcastResponse {
  success: boolean;
  broadcasts: any[];
  statistics: any;
  pagination: any;
}

function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  // Use your existing implementation or import from retrieve-broadcasts.ts
  return fetch(url, { ...options, credentials: 'include' });
}

class ReceivedBroadcastAPI {
  private baseUrl = `${API_CONFIG.baseUrl}/api/v1/broadcasts`;

async getReceivedBroadcasts(filters: ReceivedBroadcastFilters = {}): Promise<ReceivedBroadcastResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    // Always include targets in the response
    params.append('includeTargets', 'true');
    const url = `${this.baseUrl}/received-broadcasts${params.toString() ? `?${params}` : ''}`;
    const response = await makeAuthenticatedRequest(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }
}

export const receivedBroadcastAPI = new ReceivedBroadcastAPI();