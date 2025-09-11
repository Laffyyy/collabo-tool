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
  const baseUrl = 'http://localhost:5000/api/v1/user-status';
  
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
    const { baseUrl, headers } = getApiConfig();
    
    const response = await fetch(`${baseUrl}/users/status`, {
      method: 'GET',
      headers
    });

    if (response.ok) {
      const users = await response.json();
      usersWithStatus.set(users);
      return users;
    } else {
      console.error('Failed to get users with status:', response.status);
      return [];
    }
  } catch (error) {
    console.error('Error getting users with status:', error);
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
    const users = await getAllUsersWithStatus();
    return users.find(user => user.username === username) || null;
  } catch (error) {
    console.error('Error getting user by username:', error);
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