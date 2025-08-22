import { writable } from 'svelte/store';

// Define types
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  organizationUnit?: string;
  onlineStatus?: 'online' | 'away' | 'idle' | 'offline';
  lastSeen?: Date;
  profilePhoto?: string;
}

class AuthStore {
  user = $state<User | null>(null);
  isAuthenticated = $state(false);
  isLoading = $state(false);
  token = $state<string | null>(null);
  sessionToken = $state<string | null>(null);

  get userRole() {
    return this.user?.role || '';
  }

  get userInitials() {
    if (!this.user) return '';
    if (this.user.firstName && this.user.lastName) {
      return `${this.user.firstName[0]}${this.user.lastName[0]}`;
    }
    return this.user.username.substring(0, 2).toUpperCase();
  }

  get userDisplayName() {
    if (!this.user) return '';
    if (this.user.firstName && this.user.lastName) {
      return `${this.user.firstName} ${this.user.lastName}`;
    }
    return this.user.username;
  }

  get userDisplayPhoto() {
    return this.user?.profilePhoto || '/placeholder.svg';
  }

  get onlineStatusColor() {
    switch (this.user?.onlineStatus) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'idle': return 'bg-orange-400';
      default: return 'bg-gray-400';
    }
  }

  // Role-based permissions
  get canAccessAdmin() {
    return this.user?.role?.toLowerCase() === 'admin';
  }

  get canCreateChannels() {
    return ['admin', 'manager', 'supervisor'].includes(this.user?.role?.toLowerCase() || '');
  }

  get canSendBroadcasts() {
    return ['admin', 'manager', 'supervisor', 'support'].includes(this.user?.role?.toLowerCase() || '');
  }

  login(userData: User, token: string, sessionToken: string) {
    this.user = userData;
    this.isAuthenticated = true;
    this.isLoading = false;
    this.token = token;
    this.sessionToken = sessionToken;

    // Store tokens in cookies (handled by backend) and localStorage for app use
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_session', sessionToken);
  }

  logout() {
    this.user = null;
    this.isAuthenticated = false;
    this.isLoading = false;
    this.token = null;
    this.sessionToken = null;
    
    // Clear local storage
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_session');
    
    // Clear cookies - we'll use the API to do this properly
    document.cookie = 'token=; Max-Age=0; path=/; domain=' + window.location.hostname;
    document.cookie = 'session=; Max-Age=0; path=/; domain=' + window.location.hostname;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // Try to restore session from localStorage
  restoreSession() {
    try {
      const userData = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');
      const sessionToken = localStorage.getItem('auth_session');
      
      if (userData && token && sessionToken) {
        const user = JSON.parse(userData);
        this.user = user;
        this.isAuthenticated = true;
        this.token = token;
        this.sessionToken = sessionToken;
        return true;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
    return false;
  }

  updateOnlineStatus(status: "online" | "away" | "idle" | "offline") {
    if (this.user) {
      this.user.onlineStatus = status;
    }
  }

  updateProfilePhoto(photoUrl: string) {
    if (this.user) {
      this.user.profilePhoto = photoUrl;
    }
  }
}

export const authStore = writable(new AuthStore());