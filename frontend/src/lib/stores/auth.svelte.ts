import { writable } from 'svelte/store';

interface User {
  id: string
  username: string
  email: string
  role: "admin" | "manager" | "supervisor" | "support" | "frontline"
  organizationUnit: string
  firstName: string
  lastName: string
}

class AuthStore {
  user = $state<User | null>(null);
  isAuthenticated = $state(false);
  isLoading = $state(false);

  get userRole() {
    return this.user?.role;
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
      lastName: 'User'
    };
    this.isAuthenticated = true;
  }
}

export const authStore = writable(new AuthStore());
