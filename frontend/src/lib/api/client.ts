import { get } from 'svelte/store';
import { authStore } from '$lib/stores/auth.svelte';
import { API_CONFIG } from './config';
import { goto } from '$app/navigation';

interface SessionValidationResponse {
  valid: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    [key: string]: any;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const auth = get(authStore);
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    return headers;
  }

  // New helper method to handle authentication errors
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // User is not authenticated
      get(authStore).logout();
      goto('/login');
      throw new Error('Authentication required');
    }
    
    if (response.status === 403) {
      // User is authenticated but not authorized for this resource
      goto('/unauthorized');
      throw new Error('Not authorized');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'An error occurred');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    });
    
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include'
    });
    
    return this.handleResponse<T>(response);
  }

  // Specialized logout function that handles both frontend and backend logout
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await fetch(`${this.baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always logout on frontend even if backend logout fails
      get(authStore).logout();
      goto('/login');
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      // Check if we have a session token in localStorage
      const sessionToken = localStorage.getItem('auth_session');
      if (!sessionToken) {
        return false;
      }
      
      // Call an endpoint to validate the session token with proper typing
      const response = await this.get<SessionValidationResponse>('/api/auth/validate-session');
      return response.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }
}

export const apiClient = new ApiClient();