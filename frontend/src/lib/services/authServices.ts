// Create a new file: src/lib/services/authServices.ts
const AUTH_API_URL = "http://localhost:5000/api/v1/auth";

interface AuthUser {
  id: string;
  did?: string;
  email?: string;
  dusername?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  avatar?: string;
  // Add other properties as needed
}

// Login function
export async function login(email: string, password: string) {
  try {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store auth data
    localStorage.setItem('jwt', data.token);
    
    // Store user ID - try multiple possible fields
    const userId = data.user?.did || data.user?.id || data.userId;
    if (userId) {
      localStorage.setItem('auth_userId', userId);
    }
    
    // Store full user object
    localStorage.setItem('auth_user', JSON.stringify(data.user || {}));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get current user ID
export function getCurrentUserId(): string | null {
  return localStorage.getItem('auth_userId');
}

// Get current user info
export function getCurrentUser(): AuthUser | null {
  const userStr = localStorage.getItem('auth_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.error('Failed to parse user data:', e);
    return null;
  }
}

// Logout function
export function logout() {
  localStorage.removeItem('jwt');
  localStorage.removeItem('auth_userId');
  localStorage.removeItem('auth_user');
  // Redirect to login page
  window.location.href = '/login';
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  return !!getCurrentUserId() && !!localStorage.getItem('jwt');
}