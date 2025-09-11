import { writable } from 'svelte/store';

// Types
export interface UserStatus {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationalUnit: string;
  role: string;
  avatar?: string;
  status: 'online' | 'away' | 'idle' | 'offline';
  isOnline: boolean;
  lastActivity: string;
}

// Store for users with status
export const usersWithStatus = writable<UserStatus[]>([]);
export const currentUserStatus = writable<'online' | 'away' | 'idle' | 'offline'>('offline');

// Heartbeat interval
let heartbeatInterval: NodeJS.Timeout | null = null;

/**
 * Get API base URL and token
 */
function getApiConfig() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('jwt');
  const baseUrl = 'http://localhost:5000/api/v1/user-status'; // Fixed port to 5000
  
  console.log('🔍 getApiConfig: Using baseUrl:', baseUrl);
  console.log('🔍 getApiConfig: Token found:', !!token);
  
  return {
    token,
    baseUrl,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Update current user's status
 */
export async function updateUserStatus(status: 'online' | 'away' | 'idle' | 'offline'): Promise<boolean> {
  try {
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      currentUserStatus.set(status);
      return true;
    } else {
      console.error('Failed to update user status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    return false;
  }
}

/**
 * Get current user's status
 */
export async function getCurrentUserStatus(): Promise<UserStatus | null> {
  try {
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/status`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const userStatus = await response.json();
      currentUserStatus.set(userStatus.actualStatus || userStatus.onlineStatus || 'offline');
      return userStatus;
    } else {
      console.error('Failed to get user status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error getting user status:', error);
    return null;
  }
}

/**
 * Get all users with their status
 */
export async function getAllUsersWithStatus(): Promise<UserStatus[]> {
  try {
    const { baseUrl, headers, token } = getApiConfig();
    console.log('🔍 getAllUsersWithStatus: API URL:', `${baseUrl}/users/status`);
    console.log('🔍 getAllUsersWithStatus: Token available:', !!token);
    
    // Try authenticated endpoint first
    let response = await fetch(`${baseUrl}/users/status`, {
      method: 'GET',
      headers
    });

    console.log('🔍 getAllUsersWithStatus: Auth response status:', response.status);

    // If auth fails, try dev endpoint
    if (!response.ok && response.status === 401) {
      console.log('🔍 getAllUsersWithStatus: Auth failed, trying dev endpoint...');
      response = await fetch('http://localhost:5000/api/v1/dev/test-users');
      console.log('🔍 getAllUsersWithStatus: Dev response status:', response.status);
      
      if (response.ok) {
        const devData = await response.json();
        console.log('🔍 getAllUsersWithStatus: Dev data:', devData);
        const users = devData.users || [];
        usersWithStatus.set(users);
        return users;
      }
    }

    if (response.ok) {
      const users = await response.json();
      console.log('🔍 getAllUsersWithStatus: Users received:', users);
      console.log('🔍 getAllUsersWithStatus: User count:', users.length);
      usersWithStatus.set(users);
      return users;
    } else {
      const errorText = await response.text();
      console.error('❌ getAllUsersWithStatus: Failed with status:', response.status, errorText);
      return [];
    }
  } catch (error) {
    console.error('❌ getAllUsersWithStatus: Network error:', error);
    return [];
  }
}

/**
 * Send heartbeat to keep user active
 */
export async function sendHeartbeat(): Promise<boolean> {
  try {
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/heartbeat`, {
      method: 'POST',
      headers
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending heartbeat:', error);
    return false;
  }
}

/**
 * Set user as online
 */
export async function setUserOnline(): Promise<boolean> {
  try {
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/online`, {
      method: 'POST',
      headers
    });

    if (response.ok) {
      currentUserStatus.set('online');
      startHeartbeat();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting user online:', error);
    return false;
  }
}

/**
 * Set user as offline
 */
export async function setUserOffline(): Promise<boolean> {
  try {
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/offline`, {
      method: 'POST',
      headers
    });

    if (response.ok) {
      currentUserStatus.set('offline');
      stopHeartbeat();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting user offline:', error);
    return false;
  }
}

/**
 * Start heartbeat to keep user status active
 */
export function startHeartbeat() {
  // Clear any existing interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Send heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, 30000);
  
  // Send initial heartbeat
  sendHeartbeat();
}

/**
 * Stop heartbeat
 */
export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Initialize user status tracking
 */
export async function initializeUserStatus() {
  // Set user as online when they access the app
  await setUserOnline();
  
  // Start periodic refresh of all users' status
  setInterval(getAllUsersWithStatus, 60000); // Refresh every minute
  
  // Initial load
  await getAllUsersWithStatus();
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      updateUserStatus('away');
    } else {
      updateUserStatus('online');
      startHeartbeat();
    }
  });
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    setUserOffline();
  });
  
  // Handle idle detection
  let idleTimer: NodeJS.Timeout | null = null;
  let isIdle = false;
  
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    
    if (isIdle) {
      isIdle = false;
      updateUserStatus('online');
    }
    
    idleTimer = setTimeout(() => {
      isIdle = true;
      updateUserStatus('idle');
    }, 300000); // 5 minutes
  };
  
  // Listen for user activity
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
    document.addEventListener(event, resetIdleTimer, { passive: true });
  });
  
  // Initialize idle timer
  resetIdleTimer();
}

/**
 * Get user info by username for profile modal
 */
export async function getUserByUsername(username: string): Promise<UserStatus | null> {
  try {
    console.log('🔍 getUserByUsername: Searching for username via direct API:', username);
    const { baseUrl, headers } = getApiConfig();
    
    // Try the direct endpoint first
    try {
      const response = await fetch(`${baseUrl}/users/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const user = await response.json();
        console.log('✅ getUserByUsername: Found user via direct API:', user);
        return user;
      } else if (response.status === 401) {
        console.log('⚠️ getUserByUsername: Auth failed, trying dev endpoint...');
        
        // Try dev endpoint
        const devResponse = await fetch(`http://localhost:5000/api/v1/dev/test-user/${encodeURIComponent(username)}`);
        if (devResponse.ok) {
          const devData = await devResponse.json();
          console.log('✅ getUserByUsername: Found user via dev API:', devData);
          return devData.user;
        }
      } else {
        console.log('⚠️ getUserByUsername: Direct API failed, falling back to search');
      }
    } catch (directError) {
      console.log('⚠️ getUserByUsername: Direct API error, falling back to search:', directError);
    }
    
    // Fallback to searching through all users
    console.log('🔍 getUserByUsername: Searching through all users for:', username);
    const users = await getAllUsersWithStatus();
    console.log('🔍 getUserByUsername: All users from API:', users);
    console.log('🔍 getUserByUsername: All usernames:', users.map(u => u.username));
    
    const foundUser = users.find(user => user.username === username);
    console.log('🔍 getUserByUsername: Exact match result:', foundUser);
    
    if (!foundUser) {
      console.log('🔍 getUserByUsername: Trying case-insensitive search...');
      const lowerUsername = username.toLowerCase();
      const caseInsensitiveUser = users.find(user => user.username.toLowerCase() === lowerUsername);
      console.log('🔍 getUserByUsername: Case-insensitive result:', caseInsensitiveUser);
      
      // Try matching by name as well
      if (!caseInsensitiveUser) {
        console.log('🔍 getUserByUsername: Trying name-based search...');
        const nameMatch = users.find(user => 
          `${user.firstName} ${user.lastName}`.trim().toLowerCase() === username.toLowerCase() ||
          user.firstName?.toLowerCase() === username.toLowerCase() ||
          user.lastName?.toLowerCase() === username.toLowerCase()
        );
        console.log('🔍 getUserByUsername: Name-based result:', nameMatch);
        return nameMatch || null;
      }
      
      return caseInsensitiveUser || null;
    }
    
    return foundUser;
  } catch (error) {
    console.error('❌ getUserByUsername: Error:', error);
    return null;
  }
}

/**
 * Format last activity time
 */
export function formatLastActivity(lastActivity: string): string {
  if (!lastActivity) return 'Never';
  
  const now = new Date();
  const activity = new Date(lastActivity);
  const diffMs = now.getTime() - activity.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'away': return 'bg-yellow-500';
    case 'idle': return 'bg-orange-500';
    case 'offline': return 'bg-gray-400';
    default: return 'bg-gray-400';
  }
}

/**
 * Get status text
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'online': return 'Online';
    case 'away': return 'Away';
    case 'idle': return 'Idle';
    case 'offline': return 'Offline';
    default: return 'Unknown';
  }
}