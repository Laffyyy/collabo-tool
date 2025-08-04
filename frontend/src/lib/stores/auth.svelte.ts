import { writable } from 'svelte/store';

interface User {
  id: string
  username: string
  email: string
  role: "admin" | "manager" | "supervisor" | "support" | "frontline"
  organizationUnit: string
  firstName: string
  lastName: string
  profilePhoto?: string
  onlineStatus: "online" | "away" | "idle" | "offline"
  lastSeen?: Date
}

class AuthStore {
  user = $state<User | null>(null);
  isAuthenticated = $state(false);
  isLoading = $state(false);

  get userRole() {
    return this.user?.role;
  }

  get userInitials() {
    if (!this.user) return '';
    return `${this.user.firstName.charAt(0)}.${this.user.lastName.charAt(0)}`;
  }

  get userDisplayPhoto() {
    return this.user?.profilePhoto || this.userInitials;
  }

  get onlineStatusColor() {
    switch (this.user?.onlineStatus) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'idle': return 'bg-orange-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  get canAccessAdmin() {
    return this.user?.role === "admin";
  }

  get canCreateChannels() {
    return ["admin", "manager", "supervisor", "support"].includes(this.user?.role || "");
  }

  get canSendBroadcasts() {
    return ["admin", "manager", "supervisor", "support"].includes(this.user?.role || "");
  }

  login(user: User) {
    this.user = user;
    this.isAuthenticated = true;
    this.isLoading = false;
  }

  logout() {
    this.user = null;
    this.isAuthenticated = false;
    this.isLoading = false;
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // Initialize with demo user for development
  constructor() {
    this.user = {
      id: '1',
      username: 'admin',
      email: 'admin@company.com',
      role: 'admin',
      organizationUnit: 'Engineering',
      firstName: 'Admin',
      lastName: 'User',
      onlineStatus: 'online',
      lastSeen: new Date()
    };
    this.isAuthenticated = true;
  }

  updateOnlineStatus(status: "online" | "away" | "idle" | "offline") {
    if (this.user) {
      this.user.onlineStatus = status;
      if (status !== 'offline') {
        this.user.lastSeen = new Date();
      }
    }
  }

  updateProfilePhoto(photoUrl: string) {
    if (this.user) {
      this.user.profilePhoto = photoUrl;
    }
  }
}

export const authStore = writable(new AuthStore());
