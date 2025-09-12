// Authentication utility for API calls

let authToken: string | null = null;

class AuthManager {
  private static instance: AuthManager;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Get a valid auth token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // Get a new token from the demo login endpoint
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get auth token: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.token) {
        throw new Error('Invalid response from demo login');
      }

      this.token = data.token;
      // Set expiry to 23 hours from now (token expires in 24h)
      this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
      
      return this.token!
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  }

  /**
   * Clear the stored token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}

/**
 * Make an authenticated API request
 */
export async function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const authManager = AuthManager.getInstance();
  
  try {
    const token = await authManager.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Error making authenticated request:', error);
    throw error;
  }
}

export { AuthManager };