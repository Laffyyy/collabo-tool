import { API_CONFIG } from './config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string>;
}

/**
 * API client for making HTTP requests
 */
class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Make an API request
   */
  async request<T>(
    endpoint: string,
    method: HttpMethod = 'GET',
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { params, headers = {}, body, ...rest } = options;
    
    // Build the URL with query parameters
    let url = `${this.baseUrl}/api/${API_CONFIG.version}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, value);
      });
      url += `?${searchParams}`;
    }
    
    // Prepare headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    
    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        ...rest
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'An error occurred',
          data
        };
      }
      
      return data as T;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // Convenience methods
  get<T>(endpoint: string, options?: ApiRequestOptions) {
    return this.request<T>(endpoint, 'GET', options);
  }
  
  post<T>(endpoint: string, body: any, options?: ApiRequestOptions) {
    return this.request<T>(endpoint, 'POST', { ...options, body });
  }
  
  put<T>(endpoint: string, body: any, options?: ApiRequestOptions) {
    return this.request<T>(endpoint, 'PUT', { ...options, body });
  }
  
  delete<T>(endpoint: string, options?: ApiRequestOptions) {
    return this.request<T>(endpoint, 'DELETE', options);
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient(API_CONFIG.baseUrl);